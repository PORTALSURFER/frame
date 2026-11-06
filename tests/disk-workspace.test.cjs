const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../scripts/serve.cjs');

test('disk workspaces follow saved revisions without leaving the review or overwriting divergent edits', async t => {
  const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-disk-test-'));
  const server = createServer(undefined, {dataDirectory});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({executablePath: process.env.FRAME_BROWSER_PATH || undefined});
  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(dataDirectory, {recursive:true, force:true});
  });
  const context = await browser.newContext();
  const url = 'http://127.0.0.1:' + server.address().port;
  const review = await context.newPage(), editor = await context.newPage();
  const errors = [];
  for (const page of [review, editor]) page.on('pageerror', error => errors.push(error.message));
  await review.goto(url);
  await review.evaluate(async () => {
    await Frame.project.startup.ready;
    const id = 'disk-review';
    Frame.registerDocument({version:1,id,name:'Review',revisionId:'r1',width:1000,height:700,
      elements:[Frame.components.text('label',{x:20,y:20,width:200,height:40},{text:'Original'})]});
    Frame.agent.selectDesign(id);
    Frame.project.setViewportPresets(id,[{name:'Desktop',width:1000,height:700},{name:'Phone',width:393,height:852}]);
    await Frame.project.automaticCheckpoints.enable(id);
  });
  const selected = page => page.locator('#revision-picker').inputValue();
  const head = page => page.evaluate(() => Frame.project.readCheckpointHead('disk-review'));
  const generation = (await head(review)).generation;
  await editor.goto(url);
  assert.equal(await editor.evaluate(async () => (await Frame.project.startup.ready).state),'restored');
  assert.equal((await head(editor)).generation,generation,'opening an already saved design makes no checkpoint write');

  const view = await review.evaluate(async () => {
    Frame.agent.setViewport('disk-review',{width:393,height:852});
    Frame.view.set({zoom:1.25,panX:7,panY:12});
    return Frame.view.get();
  });
  assert.equal((await head(review)).generation,generation,'view changes alone do not write the project');
  const explicit=await review.evaluate(() => Frame.project.automaticCheckpoints.save());
  assert.equal(explicit.error,null);
  const saved = await editor.evaluate(async () => {
    const doc = Frame.agent.getDocument('disk-review');
    doc.revisionId = 'r2';
    doc.elements[0].text = 'Saved in the other tab';
    Frame.agent.updateDocument(doc);
    return Frame.project.automaticCheckpoints.flush();
  });
  assert.equal(saved.error,null,'a competing review view save can be retried');
  await review.waitForFunction(() => document.getElementById('revision-picker').value==='r2',undefined,{timeout:6000});
  assert.equal(await selected(review),'r2');
  assert.equal(await review.locator('#viewport-picker').inputValue(),'393×852');
  assert.deepEqual(await review.evaluate(() => Frame.view.get()),view);
  assert.equal(await review.locator('#project-save-notice').textContent(),'');

  await review.evaluate(async () => {
    const feedback=Frame.agent.getFeedback();
    await Frame.disk.save('feedback',feedback.design,0,{...feedback,width:1000,height:700});
    feedback.lines.push({...FrameFeedback.metadata('stroke',Frame.designs.get(feedback.design)),points:[[5,5],[15,15]]});
    Frame.projectBridge.importFeedback(feedback);
  });
  await review.waitForFunction(async () => (await Frame.disk.read('feedback','disk-review'))?.data.lines.length===1);
  assert.equal(await review.locator('#feedback-save-notice').textContent(),'');

  await review.evaluate(() => {
    const doc=Frame.agent.getDocument('disk-review');doc.revisionId='r3';doc.elements[0].text='One branch';
    Frame.agent.updateDocument(doc);
  });
  await editor.evaluate(async () => {
    const doc=Frame.agent.getDocument('disk-review');doc.revisionId='r4';doc.elements[0].text='Other branch';
    Frame.agent.updateDocument(doc);
    await Frame.project.automaticCheckpoints.flush();
  });
  const states = await Promise.all([review,editor].map(page=>page.evaluate(() => Frame.project.automaticCheckpoints.flush())));
  assert.equal(states.filter(state=>state.state==='conflict').length,1);
  assert.deepEqual([await selected(review),await selected(editor)],['r3','r4']);
  assert.deepEqual(errors,[]);
});
