const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const {chromium} = require('playwright');
const {createServer} = require('../scripts/serve.cjs');

test('one tab switches workspaces after saving; delayed writes stay in the original folder', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-switch-'));
  const a = path.join(directory, 'a'), b = path.join(directory, 'b');
  const servers = [createServer(undefined, {dataDirectory:a}), createServer(undefined, {dataDirectory:b})];
  for (const server of servers) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const urls = servers.map(server => 'http://127.0.0.1:' + server.address().port);
  const browser = await chromium.launch({executablePath:process.env.FRAME_BROWSER_PATH || undefined});
  t.after(async () => {
    await browser.close();
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    await fs.rm(directory, {recursive:true, force:true});
  });
  const page = await browser.newPage(), seed = await browser.newPage(), errors = [];
  page.setDefaultTimeout(4000);
  for (const [index, tab] of [page, seed].entries()) {
    tab.on('pageerror', error => errors.push(error.message));
    await tab.goto(urls[index]);
    await tab.evaluate(async name => {
      await Frame.project.startup.ready;
      Frame.registerDocument({version:1,id:'shared',name,revisionId:'r1',width:500,height:400,
        elements:[Frame.components.text('title', {x:20,y:20,width:200,height:30}, {text:name})]});
      Frame.agent.selectDesign('shared');
      await Frame.project.automaticCheckpoints.enable('shared');
    }, index === 0 ? 'workspace a' : 'workspace b');
  }
  await seed.close();
  const workspaceA = await (await fetch(urls[0] + '/__frame/workspace')).json();
  const initial = await (await fetch(urls[0] + '/__frame/projects/shared')).json();
  const switchTo = (dataDirectory, origin = urls[0]) => fetch(urls[0] + '/__frame/workspace', {
    method:'POST', headers:{Origin:origin, 'Content-Type':'application/json'}, body:JSON.stringify({dataDirectory})
  });
  assert.equal((await switchTo(b, 'https://unrelated.example')).status, 403);
  assert.equal((await switchTo(path.join(directory, 'missing'))).status, 400);
  assert.equal((await switchTo(path.resolve(__dirname, '..'))).status, 400);
  assert.equal((await fetch(urls[0] + '/__frame/projects', {headers:{'X-Frame-Workspace':'unknown'}})).status, 409);
  assert.equal((await (await fetch(urls[0] + '/__frame/workspace')).json()).id, workspaceA.id);

  await page.evaluate(() => {
    window.holdWorkspace = true;
    window.addEventListener('beforeunload', event => { if (window.holdWorkspace) event.preventDefault(); });
  });
  const switched = await switchTo(b);
  assert.equal(switched.status, 200);
  const workspaceB = await switched.json();
  assert.notEqual(workspaceA.id, workspaceB.id);
  const storedB = await (await fetch(urls[0] + '/__frame/projects/shared', {headers:{'X-Frame-Workspace':workspaceB.id}})).json();
  assert.equal(storedB.generation, initial.generation, 'both workspaces deliberately start at the same generation');
  await page.waitForFunction(() => document.getElementById('workspace-sync-status').textContent.includes('Workspace changed'));
  t.diagnostic('switch waits for unfinished work');

  const edit = async (tab, revision, text) => {
    const response = tab.waitForResponse(r => r.url().endsWith('/__frame/projects/shared') &&
      r.request().method() === 'PUT' && r.ok() && r.request().postDataJSON().data.archive.currentRevisionId === revision);
    await tab.evaluate(({revision,text}) => {
      const doc = Frame.agent.getDocument('shared');
      doc.revisionId = revision; doc.elements[0].text = text; Frame.agent.updateDocument(doc);
    }, {revision,text});
    await response;
  };
  t.diagnostic('editing a');
  await edit(page, 'a2', 'saved in a while switching');
  const feedbackResponse = page.waitForResponse(r => r.url().endsWith('/__frame/feedback/shared') && r.request().method() === 'PUT' && r.ok());
  await page.evaluate(() => {
    const feedback = Frame.agent.getFeedback();
    feedback.lines.push({...FrameFeedback.metadata('stroke', Frame.designs.get('shared')),points:[[5,5],[15,15]]});
    Frame.projectBridge.importFeedback(feedback);
  });
  await feedbackResponse;
  const read = async (id, kind = 'projects') => (await fetch(urls[0] + '/__frame/' + kind + '/shared', {headers:{'X-Frame-Workspace':id}})).json();
  assert.equal((await read(workspaceA.id)).data.archive.currentRevisionId, 'a2');
  assert.deepEqual(await read(workspaceB.id), storedB, 'old saves cannot overwrite equal-generation data in b');
  assert.equal((await read(workspaceA.id, 'feedback')).data.lines.length, 1);
  assert.equal((await fetch(urls[0] + '/__frame/feedback/shared', {headers:{'X-Frame-Workspace':workspaceB.id}})).status, 404);

  const navigation = page.waitForEvent('load');
  await page.evaluate(() => { window.holdWorkspace = false; });
  await navigation;
  t.diagnostic('loaded b');
  await page.evaluate(() => Frame.project.startup.ready);
  assert.equal(await page.evaluate(() => Frame.agent.getDocument('shared').elements[0].text), 'workspace b');
  await edit(page, 'b2', 'saved only in b');
  assert.equal((await read(workspaceA.id)).data.archive.currentRevisionId, 'a2');
  assert.equal((await read(workspaceB.id)).data.archive.currentRevisionId, 'b2');
  const back = page.waitForEvent('load');
  assert.equal((await switchTo(a)).status, 200);
  await back;
  await page.evaluate(() => Frame.project.startup.ready);
  assert.equal(await page.evaluate(() => Frame.agent.getDocument('shared').elements[0].text), 'saved in a while switching');
  assert.equal(await page.evaluate(() => Frame.agent.getFeedback().lines.length), 1);
  assert.equal(await page.url(), urls[0] + '/');
  assert.deepEqual(errors, []);
});
