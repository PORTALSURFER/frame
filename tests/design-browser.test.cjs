const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
let server,browser,url;
before(async()=>{
 const root=path.resolve(__dirname,'..');
 server=http.createServer(async(req,res)=>{
  const name=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
  if(!name.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(name));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.FRAME_BROWSER_PATH||undefined});
});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
async function pageFor(t){
 const context=await browser.newContext();t.after(()=>context.close());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.goto(url);await page.locator('#design-picker').selectOption('instrument');return page;
}
test('agents inspect and edit stable elements while feedback survives refresh and PNG exports are sized',async t=>{
 const page=await pageFor(t);
 const board=await page.locator('#board').boundingBox();await page.mouse.move(board.x+100,board.y+100);await page.mouse.down();await page.mouse.move(board.x+150,board.y+150);await page.mouse.up();
 const result=await page.evaluate(async()=>{
  const before=Frame.agent.getFeedback(), ids=Frame.agent.inspect('instrument').map(n=>n.id);
  const found=Frame.agent.hitTest('instrument',300,550).map(n=>n.id);
  Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{text:'ANALYZE'}}]);
  const clean=await Frame.agent.exportImage({scale:2}),marked=await Frame.agent.exportImage({feedback:true});
  return {before,after:Frame.agent.getFeedback(),ids,nextIds:Frame.agent.inspect('instrument').map(n=>n.id),found,clean:{width:clean.width,height:clean.height,size:clean.blob.size,revision:clean.revisionId},marked:{width:marked.width,size:marked.blob.size},ready:await Frame.agent.renderReady()};
 });
 assert.deepEqual(result.before.lines,result.after.lines);assert.deepEqual(result.before.notes,result.after.notes);assert.notEqual(result.before.revisionId,result.after.revisionId);assert.deepEqual(result.ids,result.nextIds);assert.deepEqual(result.found,['run']);
 assert.equal(result.clean.width,2000);assert.equal(result.clean.height,1400);assert.ok(result.clean.size>1000);assert.equal(result.marked.width,1000);assert.ok(result.ready.ready);
 const unchanged=await page.evaluate(()=>{
  const old=Frame.agent.getDocument('instrument');try{Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{id:'bad'}}]);}catch{return JSON.stringify(old)===JSON.stringify(Frame.agent.getDocument('instrument'));}
 });
 assert.equal(unchanged,true);
});
test('responsive viewport reflows elements rather than just shrinking a fixed drawing',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(()=>{
  Frame.agent.setViewport('instrument',{width:360,height:700});
  Frame.agent.setState('instrument','error');
  return {nodes:Frame.agent.inspect('instrument'),size:Frame.currentViewport('instrument')};
 });
 assert.equal(result.nodes.find(n=>n.id==='signal').bounds.y,334);
 assert.match(result.nodes.find(n=>n.id==='status').text,/SIGNAL LOSS/);
 assert.equal(result.size.width,360);
});
test('actual prototype inputs and buttons support keyboard interaction without drawing feedback',async t=>{
 const page=await pageFor(t);await page.locator('#tool-interact').click();
 await page.locator('[data-element-id="frequency"]').fill('128');
 await page.locator('[data-element-id="reset"]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('[data-element-id="frequency"]').inputValue(),'128');
 await page.locator('[data-element-id="run"]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#state-picker').inputValue(),'loading');
 assert.equal(await page.locator('[data-element-id="run"]').isDisabled(),true);
 assert.equal(await page.locator('#brush path').count(),0);
 const result=await page.evaluate(()=>Frame.review.checkAccessibility());
 assert.equal(result.verified,true);assert.equal(result.issues.length,0);assert.deepEqual(result.focusOrder,['frequency','reset']);
});
test('zoom and pan change only view geometry and fit restores the original view',async t=>{
 const page=await pageFor(t);
 const original=await page.locator('#board').boundingBox();
 await page.locator('#zoom-in').click();const zoomed=await page.locator('#board').boundingBox();
 assert.ok(Math.abs(zoomed.width/original.width-1.25)<0.01);
 await page.locator('#tool-pan').click();
 await page.mouse.move(500,400);await page.mouse.down();await page.mouse.move(550,430);await page.mouse.up();
 const view=await page.evaluate(()=>Frame.view.get());assert.equal(view.panX,50);assert.equal(view.panY,30);
 assert.equal(await page.locator('#brush path').count(),0);
 await page.locator('#fit-view').click();
 assert.deepEqual(await page.evaluate(()=>Frame.view.get()),{zoom:1,panX:0,panY:0});
});
test('repeatable visual comparison detects changed pixels and prototype scenarios restore the initial state',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  await Frame.review.approve('instrument');
  const same=await Frame.review.compare('instrument');
  Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{style:{fill:'#45CDD5'}}}]);
  const different=await Frame.review.compare('instrument',{maxChangedRatio:0});
  const scenarios=await Frame.review.run('instrument',[{name:'Run',viewport:{width:360,height:740},state:'default',actions:[{type:'click',elementId:'run'}],expectedState:'loading'}]);
  return {same,different,scenarios,state:Frame.currentState('instrument'),viewport:Frame.currentViewport('instrument')};
 });
 assert.equal(result.same.passed,true);assert.equal(result.different.passed,false);assert.ok(result.different.changedPixels>0);
 assert.equal(result.scenarios[0].passed,true);assert.equal(result.state,'default');assert.equal(result.viewport.width,1000);
});
test('revisions compare and restore exact documents, carry bound feedback and flag removed targets',async t=>{
 const page=await pageFor(t);
 await page.evaluate(()=>{
  Frame.view.setMode('note');
  const feedback={version:3,design:'instrument',revisionId:'instrument-r1',width:1000,height:700,lines:[],notes:[
   {...FrameFeedback.metadata('note',Frame.designs.get('instrument')),text:'Move with run',anchor:[300,550],elementAnchor:{elementId:'run',offset:[24,10]}},
   {...FrameFeedback.metadata('note',Frame.designs.get('instrument')),text:'Position only',anchor:[900,650]}
  ]};
  Frame.projectBridge.importFeedback(feedback);
 });
 const result=await page.evaluate(()=>{
  const changed=Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{bounds:{x:316}}}]);
  const carried=Frame.agent.getFeedback();
  const comparison=Frame.revisions.compare('instrument','instrument-r1',changed.revisionId);
  Frame.agent.applyEdits('instrument',[{op:'remove',id:'run'}]);
  const removed=Frame.agent.getFeedback();
  Frame.revisions.restore('instrument','instrument-r1');
  return {carried,comparison,removed,restored:Frame.agent.getDocument('instrument'),count:Frame.revisions.list('instrument').length};
 });
 assert.deepEqual(result.carried.notes[0].anchor,[340,550]);
 assert.equal(result.carried.notes[0].revisionId,'instrument-r1');
 assert.equal(result.carried.notes[1].needsReview,true);
 assert.deepEqual(result.comparison.changed.map(n=>n.id),['run']);
 assert.equal(result.removed.notes[0].needsReview,true);
 assert.equal(result.restored.revisionId,'instrument-r1');assert.equal(result.count,3);
 await page.reload();await page.locator('#design-picker').selectOption('instrument');
 assert.equal(await page.evaluate(()=>Frame.revisions.list('instrument').length),3);
});
test('portable projects round trip into a fresh browser with revisions, guide, state and feedback',async t=>{
 const page=await pageFor(t);
 const project=await page.evaluate(()=>{
  Frame.agent.applyEdits('instrument',[{op:'update',id:'status',patch:{text:'PROJECT READY'}}]);
  Frame.agent.setViewport('instrument',{width:360,height:740});
  Frame.agent.setValue('instrument','frequency','128');
  Frame.agent.setState('instrument','error');
  const design=Frame.designs.get('instrument');
  Frame.projectBridge.importFeedback(FrameFeedback.document(design,[],[{...FrameFeedback.metadata('note',design),text:'Portable feedback',anchor:[20,30]}]));
  return Frame.project.export('instrument');
 });
 const other=await browser.newContext();t.after(()=>other.close());const next=await other.newPage();
 await next.goto(url);
 const result=await next.evaluate(project=>{
  // Import uses a new ID so existing example projects cannot be overwritten.
  const renamed=JSON.parse(JSON.stringify(project));renamed.archive.designId='portable';
  for(const revision of renamed.archive.revisions)revision.document.id='portable';
  renamed.feedback.design='portable';for(const mark of [...renamed.feedback.lines,...renamed.feedback.notes])mark.designId='portable';
  Frame.project.import(renamed);
  return Frame.project.export('portable');
 },project);
 assert.equal(result.archive.revisions.length,project.archive.revisions.length);
 assert.deepEqual(result.feedback.lines,[]);assert.equal(result.feedback.notes[0].text,'Portable feedback');assert.equal(result.state,'error');
 assert.equal(result.styleguide.document,project.styleguide.document);
 assert.equal(result.viewport.width,360);assert.equal(result.values.frequency,'128');
 const protectedId=await page.evaluate(project=>{
  const before=Frame.agent.getDocument('instrument');
  try{Frame.project.import(project);}catch{return JSON.stringify(before)===JSON.stringify(Frame.agent.getDocument('instrument'));}
 },project);
 assert.equal(protectedId,true);
});
test('revision IDs are immutable and invalid portable projects leave registries unchanged',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(()=>{
  const original=Frame.agent.getDocument('instrument');
  Frame.agent.applyEdits('instrument',[{op:'update',id:'status',patch:{text:'Changed'}}]);
  const current=Frame.agent.getDocument('instrument'),bad={...original,name:'Collision'};
  let collision=false;try{Frame.agent.updateDocument(bad);}catch{collision=true;}
  const project=Frame.project.export('instrument');project.feedback.design='wrong';
  const size=Frame.designs.size;let invalid=false;try{Frame.project.import(project);}catch{invalid=true;}
  return {collision,unchanged:JSON.stringify(current)===JSON.stringify(Frame.agent.getDocument('instrument')),invalid,size:Frame.designs.size,previous:size};
 });
 assert.equal(result.collision,true);assert.equal(result.unchanged,true);assert.equal(result.invalid,true);assert.equal(result.size,result.previous);
});
test('comparison UI presents snapshots and overlay without changing the selected revision',async t=>{
 const page=await pageFor(t);
 await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{text:'COMPARE ME'}}]));
 const current=await page.evaluate(()=>Frame.agent.getDocument('instrument').revisionId);
 await page.locator('#compare-revisions').click();
 await page.locator('#compare-before').selectOption('instrument-r1');
 assert.match(await page.locator('#compare-summary').textContent(),/1 changed/);
 await page.locator('#compare-overlay').check();
 assert.equal(await page.locator('#revision-canvases').evaluate(el=>el.classList.contains('overlay')),true);
 await page.locator('#close-compare').click();
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').revisionId),current);
});
test('selecting a revision immediately loads it, preserves feedback and history, and persists after reload',async t=>{
 const page=await pageFor(t);
 const board=await page.locator('#board').boundingBox();
 await page.mouse.move(board.x+100,board.y+100);await page.mouse.down();await page.mouse.move(board.x+150,board.y+150);await page.mouse.up();
 const original=await page.evaluate(()=>Frame.agent.getDocument('instrument').elements.find(n=>n.id==='run').text);
 const edited=await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{text:'NEW REVISION'}}]).revisionId);
 const before=await page.evaluate(()=>({feedback:Frame.agent.getFeedback(),history:Frame.revisions.list('instrument')}));
 await page.locator('#revision-picker').selectOption('instrument-r1');
 assert.deepEqual(await page.evaluate(()=>({revision:Frame.agent.getDocument('instrument').revisionId,text:Frame.agent.inspect('instrument').find(n=>n.id==='run').text})),{revision:'instrument-r1',text:original});
 assert.deepEqual(await page.evaluate(()=>Frame.agent.getFeedback().lines),before.feedback.lines);
 assert.deepEqual(await page.evaluate(()=>Frame.revisions.list('instrument')),before.history);
 await page.locator('#revision-picker').selectOption(edited);
 assert.equal(await page.evaluate(()=>Frame.agent.inspect('instrument').find(n=>n.id==='run').text),'NEW REVISION');
 await page.reload();await page.locator('#design-picker').selectOption('instrument');
 assert.equal(await page.locator('#revision-picker').inputValue(),edited);
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').revisionId),edited);
 assert.deepEqual(await page.evaluate(()=>Frame.agent.getFeedback().lines),before.feedback.lines);
});
test('embedded image assets decode before readiness and survive portable export',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=c.height=2;c.getContext('2d').fillRect(0,0,2,2);
  const doc=Frame.agent.getDocument('instrument');doc.assets=[{id:'sample',data:c.toDataURL('image/png')}];
  doc.elements.push(Frame.components.image('sample-image',{x:900,y:640,width:24,height:24},{assetId:'sample'}));
  doc.revisionId='image-r1';Frame.agent.updateDocument(doc);
  await Frame.agent.renderReady();
  const image=await Frame.agent.exportImage();return {size:image.blob.size,assets:Frame.project.export('instrument').assets};
 });
 assert.ok(result.size>1000);assert.equal(result.assets[0].id,'sample');
});
test('saved viewport, state and input values resume with the browser draft',async t=>{
 const page=await pageFor(t);
 await page.evaluate(()=>{
  Frame.agent.setViewport('instrument',{width:360,height:740});
  Frame.agent.setState('instrument','error');Frame.agent.setValue('instrument','frequency','128');
 });
 await page.reload();await page.locator('#design-picker').selectOption('instrument');
 assert.deepEqual(await page.evaluate(()=>Frame.currentViewport('instrument')),{width:360,height:740});
 assert.equal(await page.evaluate(()=>Frame.currentState('instrument')),'error');
 assert.equal(await page.evaluate(()=>Frame.agent.getValues('instrument').frequency),'128');
});
test('asset decode failure is a render error rather than a false ready signal',async t=>{
 const page=await pageFor(t);
 const rejected=await page.evaluate(async()=>{
  const doc=Frame.agent.getDocument('instrument');doc.assets=[{id:'bad',data:'data:image/png;base64,invalid'}];
  doc.elements.push(Frame.components.image('bad-image',{x:20,y:20,width:20,height:20},{assetId:'bad'}));doc.revisionId='bad-image-r1';
  Frame.agent.updateDocument(doc);
  try{await Frame.agent.renderReady();return false;}catch{return true;}
 });
 assert.equal(rejected,true);assert.equal(await page.locator('#design-status').isVisible(),true);
});

test('project save failures retain revisions for export and retry persists the browser draft',async t=>{
 const page=await pageFor(t);
 await page.evaluate(()=>{
  window.originalProjectSave=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(key.startsWith('frame-project-v1:'))throw new DOMException('Full','QuotaExceededError');
   return window.originalProjectSave.call(this,key,value);
  };
  Frame.agent.applyEdits('instrument',[{op:'update',id:'status',patch:{text:'RECOVERABLE DRAFT'}}]);
 });
 assert.match(await page.locator('#project-save-notice').textContent(),/unsaved/);
 assert.equal(await page.evaluate(()=>Frame.project.export('instrument').archive.revisions.length),2);
 await page.locator('#design-picker').selectOption('starter');
 await page.locator('#design-picker').selectOption('instrument');
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').elements.find(n=>n.id==='status').text),'RECOVERABLE DRAFT');
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalProjectSave;});
 await page.locator('#retry-project-save').click();
 assert.equal(await page.locator('#project-save-notice').textContent(),'');
 await page.reload();await page.locator('#design-picker').selectOption('instrument');
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').elements.find(n=>n.id==='status').text),'RECOVERABLE DRAFT');
});
test('unreadable saved project archives are protected while in-memory edits remain exportable',async t=>{
 const page=await pageFor(t);
 await page.evaluate(()=>localStorage.setItem('frame-project-v1:instrument','unreadable backup'));
 await page.reload();await page.locator('#design-picker').selectOption('instrument');
 await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'status',patch:{text:'IN MEMORY'}}]));
 await page.locator('#retry-project-save').click();
 assert.match(await page.locator('#project-save-notice').textContent(),/protected/);
 const result=await page.evaluate(()=>({backup:localStorage.getItem('frame-project-v1:instrument'),project:Frame.project.export('instrument')}));
 assert.equal(result.backup,'unreadable backup');assert.equal(result.project.archive.revisions.length,2);
});

test('bound strokes recover their element offset after the target is removed and restored',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(()=>{
  const design=Frame.designs.get('instrument'),target=Frame.agent.inspect('instrument',{elementId:'run'})[0];
  const points=[[target.bounds.x+5,target.bounds.y+10],[target.bounds.x+45,target.bounds.y+15]];
  const line={...FrameFeedback.metadata('stroke',design),elementAnchor:{elementId:'run',offset:[5,10]},points};
  Frame.projectBridge.importFeedback(FrameFeedback.document(design,[line],[]));
  Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{bounds:{...target.bounds,x:340}}}]);
  Frame.agent.applyEdits('instrument',[{op:'remove',id:'run'}]);
  const removed=Frame.agent.getFeedback().lines[0];
  Frame.revisions.restore('instrument','instrument-r1');
  return {removed,restored:Frame.agent.getFeedback().lines[0],points};
 });
 assert.equal(result.removed.needsReview,true);
 assert.equal(result.restored.needsReview,false);
 assert.deepEqual(result.restored.points,result.points);
});

test('a new source revision starts a snapshot and subsequent reloads retain edits to that source',async t=>{
 const page=await pageFor(t);
 await page.route('**/examples/instrument.js',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:(await response.text()).replace('instrument-r1','instrument-r2')});
 });
 await page.reload();await page.locator('#design-picker').selectOption('instrument');
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').revisionId),'instrument-r2');
 await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'status',patch:{text:'NEW SOURCE DRAFT'}}]));
 await page.reload();await page.locator('#design-picker').selectOption('instrument');
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').elements.find(n=>n.id==='status').text),'NEW SOURCE DRAFT');
 assert.equal(await page.evaluate(()=>Frame.revisions.list('instrument').length),3);
});
