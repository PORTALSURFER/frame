const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../scripts/serve.cjs');
let server,browser,url;
before(async()=>{server=createServer(path.resolve(__dirname,'..'));await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;browser=await chromium.launch();});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
async function pageFor(t,override=''){
 const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage();page.setDefaultTimeout(5000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 if(override)await page.route('**/source-store.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+override});});
 await page.goto(url);await page.locator('#design-picker').selectOption('instrument');
 await page.evaluate(async()=>{await Frame.project.startup.ready;await Frame.sources.ready;});
 return page;
}
async function sourceFor(page){
 let doc=await page.evaluate(()=>Frame.agent.getDocument('instrument')),calls=0;
 await page.route('**/source.json',route=>{calls++;return route.fulfill({json:doc});});
 return {get doc(){return doc;},set doc(next){doc=next;},get calls(){return calls;}};
}
async function connect(page){return page.evaluate(()=>Frame.sources.connect({url:'/source.json',interval:60000}));}
test('verified sources reconnect after refresh and preserve review state and feedback through same-tab edits',async t=>{
 const page=await pageFor(t),source=await sourceFor(page);
 await page.evaluate(async()=>{
  Frame.agent.setState('instrument','error');Frame.agent.setValue('instrument','frequency','128');Frame.view.set({zoom:1.5,panX:14,panY:17});
  const f=Frame.agent.getFeedback();f.notes.push({...FrameFeedback.metadata('note',Frame.designs.get('instrument')),anchor:[20,20],text:'keep feedback'});Frame.projectBridge.importFeedback(f);
  await Frame.project.automaticCheckpoints.enable();
 });
 assert.equal((await connect(page)).state,'watching');
 const next=structuredClone(source.doc);next.revisionId='source-r2';next.elements.find(n=>n.id==='run').text='from file';source.doc=next;
 await page.reload();
 const result=await page.evaluate(async()=>{await Frame.project.startup.ready;await Frame.sources.ready;await Frame.project.automaticCheckpoints.flush();return {status:Frame.sources.status(),doc:Frame.agent.getDocument('instrument'),view:Frame.view.get(),state:Frame.currentState('instrument'),values:Frame.agent.getValues('instrument'),feedback:Frame.agent.getFeedback(),settings:await Frame.sources.settings(),project:Frame.project.export()};});
 assert.equal(result.status.state,'watching',result.status.error);assert.equal(result.doc.revisionId,'source-r2');assert.equal(result.doc.elements.find(n=>n.id==='run').text,'from file');
 assert.deepEqual(result.view,{zoom:1.5,panX:14,panY:17});assert.equal(result.state,'error');assert.equal(result.values.frequency,'128');assert.equal(result.feedback.notes[0].text,'keep feedback');
 assert.equal(result.settings.revisionId,'source-r2');assert.match(result.settings.digest,/^[a-f0-9]{64}$/);assert.equal(result.project.source,undefined);assert.equal(result.project.sourceSession,undefined);
 assert.equal(page.url(),url+'/');
});
test('local edits after the verified baseline pause reconnect without fetching or replacing the design',async t=>{
 const page=await pageFor(t),source=await sourceFor(page);await connect(page);
 await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{text:'local edit'}}]));
 const calls=source.calls;await page.reload();
 const result=await page.evaluate(async()=>{await Frame.project.startup.ready;await Frame.sources.ready;return {status:Frame.sources.status(),text:Frame.agent.getDocument('instrument').elements.find(n=>n.id==='run').text};});
 assert.equal(result.status.state,'conflict');assert.match(result.status.error,/differs/);assert.equal(result.text,'local edit');assert.equal(source.calls,calls);
});
test('first attach refuses mismatched documents and unsafe URLs without publishing settings',async t=>{
 const page=await pageFor(t),source=await sourceFor(page);source.doc={...source.doc,revisionId:'source-diverged'};
 const original=await page.evaluate(()=>Frame.agent.getDocument('instrument'));
 assert.equal((await connect(page)).state,'conflict');assert.equal(await page.evaluate(()=>Frame.sources.settings()),null);
 assert.deepEqual(await page.evaluate(()=>Frame.agent.getDocument('instrument')),original);
 const errors=await page.evaluate(async()=>{const out=[];for(const url of ['https://example.com/source.json','http://user:pass@'+location.host+'/source.json','file:///tmp/source.json'])try{await Frame.sources.connect({url});}catch(e){out.push(e.message);}return out;});
 assert.equal(errors.length,3);assert.ok(errors.every(e=>/same-origin/.test(e)));
});
test('source settings transactions reject stale writers and preserve the winner',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  const store=Frame.sourceStore.create({name:'source-cas-test'}),record={id:'fixture',url:location.origin+'/source.json',interval:1000,enabled:true,revisionId:'r1',digest:'a'.repeat(64)};
  const first=await store.save(record,0);
  const both=await Promise.allSettled([store.save({...record,revisionId:'r2'},first.generation),store.save({...record,revisionId:'r3'},first.generation)]);
  return {results:both.map(r=>({status:r.status,name:r.reason?.name,value:r.value})),saved:await store.read('fixture')};
 });
 assert.equal(result.results.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.results.find(r=>r.status==='rejected').name,'ConflictError');assert.equal(result.saved.generation,2);
 assert.equal(result.saved.revisionId,result.results.find(r=>r.status==='fulfilled').value.revisionId);
});
for(const operation of ['read','save'])test(`source ${operation} failures remain visible and never report a persisted connection`,async t=>{
 const code=`\nconst originalCreate=Frame.sourceStore.create;Frame.sourceStore.create=options=>{const store=originalCreate(options);store.${operation}=async()=>{throw new Error('source ${operation} unavailable');};return store;};`;
 const page=await pageFor(t,code);await sourceFor(page);
 let result;try{result=await connect(page);}catch{}
 const status=await page.evaluate(()=>Frame.sources.status());assert.ok(['error','conflict'].includes(status.state));assert.match(status.error,new RegExp(`source ${operation} unavailable`));
 assert.notEqual(result?.state,'watching');
});
test('disconnect cancels an admitted fetch and stays disconnected after refresh',async t=>{
 const page=await pageFor(t);const source=await sourceFor(page);await connect(page);
 let release,started;const began=new Promise(r=>started=r),gate=new Promise(r=>release=r);
 await page.route('**/delayed.json',async route=>{started();await gate;try{await route.fulfill({json:source.doc});}catch{}});
 await page.evaluate(()=>{window.pendingSource=Frame.sources.connect({url:'/delayed.json',interval:60000});window.pendingSource.catch(()=>{});});await began;
 await page.evaluate(()=>Frame.sources.disconnect());release();await page.evaluate(()=>window.pendingSource);
 assert.equal((await page.evaluate(()=>Frame.sources.settings())).enabled,false);const calls=source.calls;
 await page.reload();await page.evaluate(async()=>{await Frame.project.startup.ready;await Frame.sources.ready;});
 assert.equal((await page.evaluate(()=>Frame.sources.status())).state,'disconnected');assert.equal(source.calls,calls);
});
test('gestures pause source updates and local edits during an asynchronous check win',async t=>{
 const page=await pageFor(t),source=await sourceFor(page);await connect(page);
 source.doc={...source.doc,revisionId:'source-r2'};
 const paused=await page.evaluate(async()=>{window.can=Frame.projectBridge.canCheckpoint;Frame.projectBridge.canCheckpoint=()=>false;const status=await Frame.sources.poll();Frame.projectBridge.canCheckpoint=can;return {status,revision:Frame.agent.getDocument('instrument').revisionId};});
 assert.equal(paused.status.state,'paused');assert.notEqual(paused.revision,'source-r2');
 await page.evaluate(()=>Frame.sources.poll());
 source.doc={...source.doc,revisionId:'source-r3'};
 const result=await page.evaluate(async()=>{
  const digest=Frame.project.startupEvidence.digest;Frame.project.startupEvidence.digest=async text=>{Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{text:'local wins'}}]);return digest(text);};
  const status=await Frame.sources.poll();Frame.project.startupEvidence.digest=digest;
  return {status,text:Frame.agent.getDocument('instrument').elements.find(n=>n.id==='run').text,saved:await Frame.sources.settings()};
 });
 assert.equal(result.status.state,'conflict');assert.equal(result.text,'local wins');assert.equal(result.saved.revisionId,'source-r2');
});
test('source connection controls connect a verified document and disconnect it durably',async t=>{
 const page=await pageFor(t);await sourceFor(page);
 await page.locator('.project-menu summary').click();await page.locator('#source-settings').click();
 await page.locator('#source-url').fill('/source.json');await page.locator('#source-interval').fill('60000');await page.locator('#connect-source').click();
 await page.waitForFunction(()=>Frame.sources.status().state==='watching');assert.match(await page.locator('#live-document-status').textContent(),/watching/);
 const statusChanges=await page.evaluate(async()=>{
  let changes=0;
  const observer=new MutationObserver(records=>{changes+=records.length;});
  observer.observe(document.getElementById('live-document-status'),{childList:true,subtree:true});
  try{await Frame.sources.poll();await Frame.sources.poll();return changes+observer.takeRecords().length;}
  finally{observer.disconnect();}
 });
 assert.equal(statusChanges,0,'unchanged source polls do not repeat the status');
 await page.locator('#source-settings').click();await page.locator('#disconnect-source').click();
 await page.waitForFunction(()=>Frame.sources.status().state==='disconnected');assert.equal((await page.evaluate(()=>Frame.sources.settings())).enabled,false);
});
test('concurrent settings changes pause source updates without overwriting the other writer',async t=>{
 const page=await pageFor(t),source=await sourceFor(page);await connect(page);source.doc={...source.doc,revisionId:'other-source-r2'};
 const result=await page.evaluate(async()=>{
  const original=await Frame.sources.settings(),store=Frame.sourceStore.create();
  await store.save({...original,enabled:false},original.generation);
  const status=await Frame.sources.poll();return {status,saved:await store.read('instrument'),revision:Frame.agent.getDocument('instrument').revisionId};
 });
 assert.equal(result.status.state,'conflict');assert.equal(result.saved.enabled,false);assert.equal(result.saved.generation,2);assert.notEqual(result.revision,'other-source-r2');
});
test('selection cancels pending source admission before it can publish settings',async t=>{
 const page=await pageFor(t),source=await sourceFor(page);let release,started;const began=new Promise(r=>started=r),gate=new Promise(r=>release=r);
 await page.route('**/delayed.json',async route=>{started();await gate;try{await route.fulfill({json:source.doc});}catch{}});
 await page.evaluate(()=>{window.pendingSource=Frame.sources.connect({url:'/delayed.json',interval:60000});window.pendingSource.catch(()=>{});});await began;
 await page.locator('#design-picker').selectOption('starter');release();await page.evaluate(()=>window.pendingSource);
 assert.equal(await page.evaluate(()=>Frame.sources.settings('instrument')),null);assert.equal(await page.locator('#design-picker').inputValue(),'starter');
});
test('unreadable saved settings stay protected and checkpoint conflicts prevent reconnect',async t=>{
 const page=await pageFor(t),source=await sourceFor(page);await connect(page);const calls=source.calls;
 await page.route('**/startup-restore.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+"\nFrame.project.startup.ready=Frame.project.startup.ready.then(s=>({...s,designId:'instrument',state:'conflict'}));"});});
 await page.reload();const status=await page.evaluate(async()=>{await Frame.project.startup.ready;await Frame.sources.ready;return Frame.sources.status();});
 assert.equal(status.state,'conflict');assert.match(status.error,/Checkpoint startup/);assert.equal(source.calls,calls);
 await page.evaluate(()=>new Promise((resolve,reject)=>{const open=indexedDB.open('frame-source-sessions-v1',1);open.onsuccess=()=>{const db=open.result,tx=db.transaction('sources','readwrite');tx.objectStore('sources').put({id:'instrument',version:999});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
 await page.reload();const error=await page.evaluate(async()=>{await Frame.project.startup.ready;await Frame.sources.ready;return Frame.sources.status();});assert.equal(error.state,'error');assert.match(error.error,/Invalid source settings/);assert.equal(source.calls,calls);
 const raw=await page.evaluate(()=>new Promise(resolve=>{const open=indexedDB.open('frame-source-sessions-v1',1);open.onsuccess=()=>{const db=open.result,tx=db.transaction('sources'),request=tx.objectStore('sources').get('instrument');request.onsuccess=()=>resolve(request.result);tx.oncomplete=()=>db.close();};}));assert.equal(raw.version,999);
});
