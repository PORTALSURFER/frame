const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
let server, browser, url;
before(async () => {
  const root = path.resolve(__dirname, '..');
  server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try { res.end(await fs.readFile(file)); } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({executablePath: process.env.FRAME_BROWSER_PATH || undefined});
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });
async function pageFor(t) {
  const context = await browser.newContext(); t.after(() => context.close());
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  await page.goto(url); await page.locator('#design-picker').selectOption('instrument');
  return page;
}
test('durable project round trip survives reload with feedback and protects legacy data', async t => {
  const page = await pageFor(t);
  const before = await page.evaluate(async () => {
    const project = Frame.project.export('instrument');
    const legacy = localStorage.getItem('frame-project-v1:instrument');
    const receipt = await Frame.project.saveDurable('instrument', 0);
    return {project, legacy, receipt};
  });
  await page.reload();
  const after = await page.evaluate(async () => ({record: await Frame.project.readDurable('instrument'),
    legacy: localStorage.getItem('frame-project-v1:instrument'), list: await Frame.project.listDurable()}));
  assert.deepEqual(after.record.project, before.project);
  assert.equal(after.legacy, before.legacy);
  assert.equal(before.receipt.generation, 1);
  assert.equal(after.list[0].generation, 1);
});
test('concurrent stale writes are refused and transaction failure preserves the last good project', async t => {
  const page = await pageFor(t);
  const result = await page.evaluate(async () => {
    const a = FrameProjectStore.create({name: 'concurrency-test'}), b = FrameProjectStore.create({name: 'concurrency-test'});
    const project = Frame.project.export('instrument');
    await a.save(project, 0);
    const outcomes = await Promise.allSettled([a.save(project, 1), b.save(project, 1)]);
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    let failure;
    try { await a.save(project, 2); } catch (error) { failure = error.name; }
    finally { IDBObjectStore.prototype.put = original; }
    const record = await b.read(project.archive.designId);
    await a.close(); await b.close();
    return {outcomes: outcomes.map(value => value.status === 'fulfilled' ? 'saved' : value.reason.name), failure, generation: record.generation, project: record.project, expected: project};
  });
  assert.deepEqual(result.outcomes.sort(), ['ConflictError', 'saved']);
  assert.equal(result.failure, 'QuotaExceededError');
  assert.equal(result.generation, 2);
  assert.deepEqual(result.project, result.expected);
});
test('durable save remains available when localStorage quota is exhausted', async t => {
  const page = await pageFor(t);
  const result = await page.evaluate(async () => {
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    Frame.agent.applyEdits('instrument', [{op: 'update', id: 'run', patch: {text: 'saved durably'}}]);
    await Frame.project.saveDurable('instrument', 0);
    return (await Frame.project.readDurable('instrument')).project.archive.currentRevisionId === Frame.agent.getDocument('instrument').revisionId;
  });
  assert.equal(result, true);
});
test('checkpoint UI recovers history as a new design without replacing current edits or saved data',async t=>{
 const page=await pageFor(t);
 await page.locator('.project-menu > summary').click();
 await page.waitForFunction(()=>!document.getElementById('save-checkpoint').disabled);
 await page.locator('#save-checkpoint').click();
 await page.waitForFunction(()=>document.getElementById('checkpoint-status').textContent.startsWith('Checkpoint saved:'));
 const saved=await page.evaluate(()=>Frame.project.readDurable('instrument'));
 await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{text:'newer unsaved work'}}]));
 await page.locator('#recover-checkpoint').click();
 await page.waitForFunction(()=>!document.getElementById('confirm-checkpoint-recovery').disabled);
 await page.locator('#checkpoint-new-id').fill('recovered-copy');
 await page.locator('#confirm-checkpoint-recovery').click();
 await page.waitForFunction(()=>document.getElementById('design-picker').value==='recovered-copy');
 const result=await page.evaluate(async()=>({original:Frame.agent.getDocument('instrument'),recovered:Frame.project.export('recovered-copy'),saved:await Frame.project.readDurable('instrument')}));
 assert.equal(result.original.elements.find(node=>node.id==='run').text,'newer unsaved work');
 assert.deepEqual(result.saved,saved);
 assert.equal(result.recovered.archive.revisions.length,saved.project.archive.revisions.length);
 assert.equal(result.recovered.feedback.design,'recovered-copy');
 assert.ok(result.recovered.archive.revisions.every(revision=>revision.document.id==='recovered-copy'));
});

test('unavailable durable storage can be retried and malformed records cannot be overwritten', async t => {
  const page = await pageFor(t);
  const result = await page.evaluate(async () => {
    let blocked = true;
    const factory = {open(...args) { if (blocked) throw new DOMException('Denied', 'SecurityError'); return indexedDB.open(...args); }};
    const store = FrameProjectStore.create({name: 'recovery-test', indexedDB: factory});
    let denied;
    try { await store.read('instrument'); } catch (error) { denied = error.name; }
    blocked = false;
    const empty = await store.read('instrument');
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('recovery-test', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put({id: 'instrument', version: 999});
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    });
    let refused;
    try { await store.save(Frame.project.export('instrument'), 0); } catch (error) { refused = error.message; }
    const raw = await new Promise(resolve => {
      const request = db.transaction('projects').objectStore('projects').get('instrument');
      request.onsuccess = () => resolve(request.result);
    });
    db.close(); await store.close(); return {denied, empty, refused, raw};
  });
  assert.equal(result.denied, 'SecurityError');
  assert.equal(result.empty, null);
  assert.match(result.refused, /protected/);
  assert.deepEqual(result.raw, {id: 'instrument', version: 999});
});
