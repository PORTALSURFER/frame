const {readFixturePage}=require('../examples/fixture-page.cjs');
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
let server,browser,url;
before(async()=>{
 const root=path.resolve(__dirname,'..');
 server=http.createServer(async(req,res)=>{
  const name=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
  if(!name.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(await (req.url==='/?blank'?fs.readFile(name):readFixturePage(name)));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.FRAME_BROWSER_PATH||undefined});
});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
async function pageFor(t){
 const context=await browser.newContext();t.after(()=>context.close());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.goto(url);await page.evaluate(id=>Frame.agent.selectDesign(id),'instrument');return page;
}
test('a fresh workspace opens without designs and offers file import',async t=>{
 const context=await browser.newContext();t.after(()=>context.close());
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url+'/?blank');
 await page.getByRole('heading',{name:'No design open'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>Frame.agent.listDesigns()),[]);
 await page.getByRole('button',{name:'Open design file'}).click();
 await page.getByRole('dialog',{name:'Import design'}).waitFor();
 assert.deepEqual(errors,[]);
});
test('compact prototype controls preserve declared padding and border geometry at zoom',async t=>{
 const page=await pageFor(t);
 await page.evaluate(()=>{
  Frame.registerDocument({version:1,id:'compact-controls',name:'Compact controls',revisionId:'r1',width:300,height:200,
   elements:[{id:'small',type:'button',label:'Compact choice',text:'sine',bounds:{x:10,y:10,width:60,height:12},
    style:{padding:0,radius:3,lineWidth:.5,stroke:'#555555',fontSize:8},action:{type:'set-state',state:'default'}}]});
  Frame.agent.selectDesign('compact-controls');Frame.view.set({zoom:1.5,panX:0,panY:0});
 });
 await page.locator('#tool-interact').click();
 const result=await page.getByRole('button',{name:'Compact choice',exact:true}).evaluate(el=>{
  const style=getComputedStyle(el),scale=document.getElementById('board').getBoundingClientRect().width/300;
  return {padding:parseFloat(style.paddingTop),radius:parseFloat(style.borderTopLeftRadius),border:parseFloat(style.borderTopWidth),height:el.getBoundingClientRect().height,scale};
 });
 assert.equal(result.padding,0);
 assert.ok(Math.abs(result.radius-3*result.scale)<.01);
 assert.ok(Math.abs(result.border-.5*result.scale)<=1);
 assert.ok(Math.abs(result.height-12*result.scale)<.1);
});
test('wheel zoom coalesces raster work and settles sharply without changing design coordinates',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  await Frame.agent.renderReady();
  const design=Frame.designs.get('instrument'),paint=design.paint,canvas=document.getElementById('design');
  const original=Frame.agent.inspect('instrument',{elementId:'run'})[0].bounds;
  let paints=0;design.paint=(...args)=>{paints++;return paint(...args);};
  const before=canvas.width,stage=document.getElementById('stage'),box=stage.getBoundingClientRect();
  for(let i=0;i<12;i++)stage.dispatchEvent(new WheelEvent('wheel',{deltaY:-80,clientX:box.x+box.width/2,clientY:box.y+box.height/2,bubbles:true,cancelable:true}));
  const during={paints,width:canvas.width,zoom:Frame.view.get().zoom};
  await Frame.agent.renderReady();
  return {before,during,after:{paints,width:canvas.width,height:canvas.height},original,next:Frame.agent.inspect('instrument',{elementId:'run'})[0].bounds};
 });
 assert.equal(result.during.paints,0);assert.equal(result.during.width,result.before);assert.ok(result.during.zoom>1);
 assert.ok(result.after.width>result.before);assert.ok(result.after.paints>0&&result.after.paints<=2);
 assert.ok(result.after.width<=8192&&result.after.height<=8192&&result.after.width*result.after.height<=16777216);
 assert.deepEqual(result.original,result.next);
});
test('button zoom remains immediate across a burst and checkpoints the final view',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  await Frame.agent.renderReady();await Frame.project.automaticCheckpoints.enable();
  const design=Frame.designs.get('instrument'),paint=design.paint;
  let paints=0,events=0;design.paint=(...args)=>{paints++;return paint(...args);};
  const epoch=Frame.projectBridge.restorationEpoch();window.addEventListener('frame:view-changed',()=>events++);
  for(let i=0;i<3;i++){document.getElementById('zoom-in').click();await new Promise(r=>setTimeout(r,120));}
  const during={paints,zoom:Frame.view.get().zoom,events,epoch:Frame.projectBridge.restorationEpoch()};
  await Frame.agent.renderReady();await Frame.project.automaticCheckpoints.flush();
  const saved=await Frame.project.readDurable('instrument');
  return {during,paints,epoch,saved:saved.project.resume.view,view:Frame.view.get()};
 });
 assert.equal(result.during.paints,0);assert.equal(result.during.zoom,1.25**3);assert.equal(result.during.events,3);
 assert.ok(result.during.epoch>result.epoch);assert.ok(result.paints>0&&result.paints<=2);assert.deepEqual(result.saved,result.view);
});
test('returning zoom to the existing resolution cancels the pending raster',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  Frame.view.set({zoom:2,panX:0,panY:0});await Frame.agent.renderReady();const design=Frame.designs.get('instrument'),paint=design.paint;
  let paints=0;design.paint=(...args)=>{paints++;return paint(...args);};
  document.getElementById('zoom-in').click();const waiting=Frame.agent.renderReady();
  document.getElementById('zoom-out').click();await waiting;
  await new Promise(r=>setTimeout(r,400));
  return {paints,view:Frame.view.get(),shadow:document.getElementById('board').classList.contains('zoomed')};
 });
 assert.equal(result.paints,0);assert.deepEqual(result.view,{zoom:2,panX:0,panY:0});assert.equal(result.shadow,true);
});
test('switching designs settles pending zoom and cannot repaint the old selection later',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  Frame.view.set({zoom:2,panX:0,panY:0});await Frame.agent.renderReady();const design=Frame.designs.get('instrument'),paint=design.paint;
  let oldPaints=0;design.paint=(...args)=>{oldPaints++;return paint(...args);};
  document.getElementById('zoom-in').click();const waiting=Frame.agent.renderReady();
  Frame.agent.selectDesign('starter');const ready=await waiting;
  await new Promise(r=>setTimeout(r,400));
  return {oldPaints,ready,view:Frame.view.get(),selected:document.getElementById('design-picker').value};
 });
 assert.equal(result.oldPaints,0);assert.equal(result.ready.designId,'starter');assert.equal(result.selected,'starter');assert.equal(result.view.zoom,1);
});
test('deferred raster failure releases renderReady and allows retry',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  Frame.view.set({zoom:2,panX:0,panY:0});await Frame.agent.renderReady();const design=Frame.designs.get('instrument'),paint=design.paint;
  design.paint=()=>{throw new Error('deferred paint failed');};
  document.getElementById('zoom-in').click();
  let error;try{await Frame.agent.renderReady();}catch(e){error=e.message;}
  const details=document.getElementById('design-error-details').textContent;
  design.paint=paint;document.getElementById('retry-render').click();const ready=await Frame.agent.renderReady();
  return {error,details,ready};
 });
 assert.match(result.error,/not render-ready/);assert.match(result.details,/deferred paint failed/);assert.equal(result.ready.ready,true);
});
test('explicit agent zoom stays synchronous and caps canvas memory at maximum zoom',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  await Frame.agent.renderReady();const canvas=document.getElementById('design'),before=canvas.width;
  Frame.view.set({zoom:8,panX:0,panY:0});
  const immediate={width:canvas.width,height:canvas.height};await Frame.agent.renderReady();
  return {before,immediate,width:canvas.width,height:canvas.height};
 });
 assert.ok(result.immediate.width>result.before);assert.equal(result.width,result.immediate.width);
 assert.equal(result.height,result.immediate.height);assert.ok(result.width<=8192&&result.height<=8192&&result.width*result.height<=16777216);
});
test('revision-checked agent commits are atomic, retryable and refuse stale or reused requests', async t => {
 const page = await pageFor(t);
 const result = await page.evaluate(() => {
  const before = Frame.agent.getDocument('instrument');
  const request = {requestId:'first-edit', designId:'instrument', expectedRevisionId:before.revisionId,
    operations:[{op:'update',id:'run',patch:{text:'updated'}}]};
  const receipt = Frame.agent.commit(request), retry = Frame.agent.commit(request);
  const after = Frame.agent.getDocument('instrument');
  const failures = [];
  for (const next of [{...request,requestId:'stale-edit'}, {...request,operations:[{op:'remove',id:'run'}]},
    {...request,requestId:'invalid-batch',expectedRevisionId:after.revisionId,operations:[{op:'update',id:'run',patch:{text:'bad'}},{op:'update',id:'missing',patch:{text:'bad'}}]}]) {
   try { Frame.agent.commit(next); } catch(error) { failures.push(error.name); }
  }
  return {receipt,retry,after,final:Frame.agent.getDocument('instrument'),failures};
 });
 assert.deepEqual(result.receipt,result.retry);
 assert.deepEqual(result.final,result.after);
 assert.equal(result.after.elements.find(node=>node.id==='run').text,'updated');
 assert.deepEqual(result.failures,['ConflictError','Error','Error']);
});
test('live source updates preserve the current view and refuse to overwrite local edits', async t => {
 const page = await pageFor(t);
 let doc = await page.evaluate(()=>Frame.agent.getDocument('instrument'));
 doc.revisionId = 'live-r2'; doc.elements.find(node=>node.id==='run').text='live update';
 await page.route('**/live.json', route=>route.fulfill({json:doc}));
 const result = await page.evaluate(async()=>{
  Frame.view.set({zoom:1.5,panX:12,panY:15});
  Frame.agent.setState('instrument','error');
  window.live = Frame.agent.watchDocument({designId:'instrument',url:'/live.json',interval:60000});
  await live.poll();
  return {view:Frame.view.get(),state:Frame.currentState('instrument'),doc:Frame.agent.getDocument('instrument'),status:live.status()};
 });
 assert.deepEqual(result.view,{zoom:1.5,panX:12,panY:15});
 assert.equal(result.state,'error'); assert.equal(result.doc.revisionId,'live-r2');
 assert.equal(result.status.state,'watching');
 await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'run',patch:{text:'local edit'}}]));
 doc.revisionId='live-r3';
 const conflict=await page.evaluate(async()=>({status:await live.poll(),doc:Frame.agent.getDocument('instrument')}));
 assert.equal(conflict.status.state,'conflict');
 assert.equal(conflict.doc.elements.find(node=>node.id==='run').text,'local edit');
 await page.evaluate(()=>live.stop());
});
test('live source failures and open dialogs preserve the design and stopping cancels pending updates', async t => {
 const page=await pageFor(t);
 let body='invalid json';
 await page.route('**/live.json', route=>route.fulfill({body}));
 const original=await page.evaluate(()=>Frame.agent.getDocument('instrument'));
 const failed=await page.evaluate(async()=>{
  window.live=Frame.agent.watchDocument({designId:'instrument',url:'/live.json',interval:60000});
  return live.poll();
 });
 assert.equal(failed.state,'error');
 assert.deepEqual(await page.evaluate(()=>Frame.agent.getDocument('instrument')),original);
 body=JSON.stringify({...original,revisionId:'live-r2'});
 await page.evaluate(()=>document.getElementById('import-dialog').showModal());
 assert.equal((await page.evaluate(()=>live.poll())).state,'paused');
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').revisionId),original.revisionId);
 await page.evaluate(()=>document.getElementById('import-dialog').close());
 await page.route('**/live.json', async route=>{await new Promise(resolve=>setTimeout(resolve,100));await route.fulfill({body});});
 const stopped=await page.evaluate(async()=>{const pending=live.poll();live.stop();await pending;return Frame.agent.getDocument('instrument').revisionId;});
 assert.equal(stopped,original.revisionId);
});
test('review context distinguishes anchors, geometry candidates and removed targets without resolving marks', async t => {
 const page=await pageFor(t);
 const result=await page.evaluate(()=>{
  const design=Frame.designs.get('instrument'), target=Frame.agent.inspect('instrument',{elementId:'run'})[0];
  const point=[target.bounds.x+2,target.bounds.y+2];
  const anchored={...FrameFeedback.metadata('stroke',design),points:[point,[point[0]+4,point[1]+4]],elementAnchor:{elementId:'run',offset:[2,2]}};
  const positional={...FrameFeedback.metadata('note',design),text:'review this',anchor:point};
  Frame.projectBridge.importFeedback(FrameFeedback.document(design,[anchored],[positional]));
  const before=Frame.agent.getFeedback(),context=Frame.agent.reviewContext();
  Frame.view.set({zoom:2,panX:20,panY:15});
  const zoomed=Frame.agent.reviewContext();
  const unchanged=Frame.agent.getFeedback();
  Frame.agent.applyEdits('instrument',[{op:'remove',id:'run'}]);
  const removed=Frame.agent.reviewContext();
  return {before,context,zoomed,unchanged,removed};
 });
 assert.deepEqual(result.before,result.unchanged);
 assert.equal(result.context.annotations[0].target.id,'run');
 assert.equal(result.context.annotations[0].match,'element-anchor');
 assert.equal(result.context.annotations[0].originalDeclaration.id,'run');
 assert.equal(result.context.annotations[1].needsReview,true);
 assert.ok(result.context.annotations[1].candidateCount>0);
 assert.deepEqual(result.context.annotations,result.zoomed.annotations);
 assert.equal(result.removed.annotations[0].target,null);
 assert.equal(result.removed.annotations[0].needsReview,true);
 assert.equal(result.removed.annotations[0].mark.status,'open');
 assert.equal(result.removed.annotations[0].originalDeclaration.id,'run');
});
test('review scenarios isolate viewports and refuse hidden or disabled controls while restoring context',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  const original=Frame.currentViewport('instrument');
  const scenarios=await Frame.review.run('instrument',[{viewport:{width:360,height:740}},{}]);
  const doc=Frame.agent.getDocument('instrument');doc.revisionId='unavailable-controls';
  doc.states.unavailable={run:{visible:false},frequency:{disabled:true}};Frame.agent.updateDocument(doc);
  Frame.agent.setState('instrument','error');
  const failures=[];
  for(const action of [{type:'click',elementId:'run'},{type:'input',elementId:'frequency',value:'bad'}]){
   try{await Frame.review.run('instrument',[{state:'unavailable',viewport:{width:360,height:740},actions:[action]}]);}catch(error){failures.push(error.message);}
  }
  return {original,scenarios,failures,state:Frame.currentState('instrument'),viewport:Frame.currentViewport('instrument'),values:Frame.agent.getValues('instrument')};
 });
 assert.equal(result.scenarios[0].viewport.width,360);
 assert.deepEqual(result.scenarios[1].viewport,result.original);
 assert.equal(result.failures.length,2);assert.ok(result.failures.every(message=>/unavailable/.test(message)));
 assert.equal(result.state,'error');assert.deepEqual(result.viewport,result.original);assert.deepEqual(result.values,{});
});
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
 await page.reload();await page.evaluate(id=>Frame.agent.selectDesign(id),'instrument');
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
 await page.reload();await page.evaluate(id=>Frame.agent.selectDesign(id),'instrument');
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
test('viewport sizes are named per design and survive a browser reload',async t=>{
 const page=await pageFor(t),picker=page.locator('#viewport-picker');
 const options=()=>picker.locator('option').allTextContents();
 const settings=async()=>{await page.locator('.project-menu summary').click();await page.locator('#configure-viewports').click();};
 assert.deepEqual(await options(),['Design size · 1000 × 700','Tablet · 768 × 1024','Phone · 360 × 740']);
 assert.equal(await picker.inputValue(),'1000×700');
 await picker.selectOption('360×740');
 await settings();
 const dialog=page.getByRole('dialog',{name:'Viewport sizes'});
 await dialog.getByRole('button',{name:'Add size'}).click();
 const added=dialog.getByRole('group',{name:'Size 4'});
 await added.getByRole('textbox',{name:'Name'}).fill('Phone');
 await added.getByRole('spinbutton',{name:'Width'}).fill('393');
 await added.getByRole('spinbutton',{name:'Height'}).fill('852');
 await dialog.getByRole('button',{name:'Save sizes'}).click();
 assert.match(await dialog.getByRole('alert').textContent(),/unique/);
 await added.getByRole('textbox',{name:'Name'}).fill('Pulse mobile');
 await dialog.getByRole('group',{name:'Size 3'}).getByRole('button',{name:'Remove viewport size'}).click();
 await dialog.getByRole('button',{name:'Save sizes'}).click();
 assert.equal(await picker.inputValue(),'393×852');
 assert.deepEqual(await page.evaluate(()=>Frame.currentViewport('instrument')),{width:393,height:852});
 assert.equal(await page.evaluate(()=>Frame.project.export('instrument').archive.viewportPresets[2].name),'Pulse mobile');
 await page.reload();
 assert.equal(await picker.inputValue(),'393×852');
 assert.deepEqual(await options(),['Design size · 1000 × 700','Tablet · 768 × 1024','Pulse mobile · 393 × 852']);
 await page.evaluate(id=>Frame.agent.selectDesign(id),'sift-style-studies');
 assert.ok((await options()).every(option=>!option.includes('Pulse mobile')));
});
test('design size follows revisions while independent presets and custom previews survive switching and import',async t=>{
 const page=await pageFor(t),picker=page.locator('#viewport-picker');
 await page.evaluate(()=>{
  Frame.registerDocument({version:1,id:'compact-vector',name:'Vector',revisionId:'r1',width:930,height:200,elements:[]});
  Frame.agent.selectDesign('compact-vector');
 });
 assert.deepEqual(await picker.locator('option').allTextContents(),['Design size · 930 × 200']);
 await page.evaluate(()=>{
  Frame.agent.setViewport('compact-vector',{width:930,height:200});
  const doc=Frame.agent.getDocument('compact-vector');
  doc.revisionId='r2';doc.width=819;
  doc.viewportPresets=[{name:'Expanded',width:1100,height:200}];
  Frame.agent.updateDocument(doc);
 });
 assert.equal(await picker.inputValue(),'819×200');
 assert.deepEqual(await picker.locator('option').allTextContents(),['Design size · 819 × 200','Expanded · 1100 × 200']);
 await picker.selectOption('1100×200');
 await page.evaluate(()=>{
  const doc=Frame.agent.getDocument('compact-vector');doc.revisionId='r3';doc.width=835;
  Frame.agent.updateDocument(doc);
  Frame.agent.setViewport('compact-vector',{width:950,height:200});
  Frame.agent.selectDesign('instrument');
  Frame.agent.selectDesign('compact-vector');
 });
 assert.equal(await picker.inputValue(),'950×200');
 await picker.selectOption('835×200');
 assert.deepEqual(await page.evaluate(()=>Frame.currentViewport('compact-vector')),{width:835,height:200});
 await page.evaluate(()=>{
  Frame.project.setViewportPresets('compact-vector',[{name:'Wide device',width:1200,height:200}]);
 });
 assert.deepEqual(await picker.locator('option').allTextContents(),['Design size · 835 × 200','Wide device · 1200 × 200']);
 await picker.selectOption('835×200');
 await page.evaluate(()=>{
  const project=Frame.project.export('compact-vector');
  project.archive.designId='imported-vector';project.feedback.design='imported-vector';
  for(const revision of project.archive.revisions)revision.document.id='imported-vector';
  Frame.project.import(project);
 });
 assert.equal(await picker.inputValue(),'835×200');
 assert.deepEqual(await picker.locator('option').allTextContents(),['Design size · 835 × 200','Wide device · 1200 × 200']);
});
test('one saved Pulse design switches layouts, states and feedback by viewport',async t=>{
 const page=await pageFor(t),id='pulse-browser-reference';
 await page.evaluate(async id=>{
  const design=Frame.agent.getDocument('instrument');
  const phone=Frame.components.text('phone-layout',{x:0,y:0,width:100,height:30},{text:'Phone',viewportLayout:'narrow'});
  design.id=id;design.name='Pulse';design.viewportLayouts={maxWidth:799,narrow:['default','phone'],wide:Object.keys(design.states)};
  for(const node of design.elements.filter(node=>!node.parentId))node.viewportLayout='wide';
  design.elements.push(phone);design.states.phone={'phone-layout':{text:'Phone detail'}};
  Frame.registerDocument(design);
  Frame.agent.selectDesign(id);
  Frame.project.setViewportPresets(id,[{name:'Desktop',width:1280,height:800},{name:'Phone',width:393,height:852}]);
  const feedback=Frame.agent.getFeedback();
  for(const width of [1280,393])feedback.lines.push({...FrameFeedback.metadata('stroke',Frame.designs.get(id)),reviewedViewport:{width,height:800},points:[[0,0],[10,10]]});
  Frame.projectBridge.importFeedback(feedback);
  await Frame.project.saveDurable(id,0);
  Frame.agent.selectDesign('instrument');
 },id);
 await page.reload();
 const menu=page.locator('.project-menu'),picker=page.locator('#viewport-picker');
 await menu.locator('summary').click();
 await menu.getByRole('button',{name:'Pulse',exact:true}).click();
 await page.waitForFunction(id=>document.getElementById('design-picker').value===id,id);
 await menu.locator('#open-designs').waitFor({state:'hidden'});
 assert.equal(await menu.getAttribute('open'),null);
 assert.equal(await picker.inputValue(),'1280×800');
 await page.locator('#state-picker').selectOption('error');
 await picker.selectOption('393×852');
 assert.equal(await page.locator('#design-picker').inputValue(),id);
 assert.equal(await page.locator('#state-picker').inputValue(),'default');
 assert.deepEqual(await page.locator('#state-picker option').allTextContents(),['default','phone']);
 assert.deepEqual(await page.evaluate(id=>Frame.agent.inspect(id).filter(node=>node.visible).map(node=>node.id),id),['phone-layout']);
 assert.equal(await page.locator('#brush path:visible').count(),1);
 const clear=page.locator('footer').getByRole('button',{name:'Clear all feedback',exact:true});
 await clear.click();
 await picker.selectOption('1280×800');
 assert.equal(await page.locator('#state-picker').inputValue(),'error');
 assert.equal(await page.locator('#brush path:visible').count(),0,'clear also removes marks from the other viewport');
 assert.equal(await clear.isDisabled(),true);
 await page.locator('#undo').click();
 assert.equal(await page.locator('#brush path:visible').count(),1);
 await picker.selectOption('393×852');
 assert.equal(await page.locator('#brush path:visible').count(),1,'undo restores marks on both viewports');
 await menu.locator('summary').click();
 await menu.getByRole('button',{name:'Browse designs'}).click();
 const library=page.getByRole('dialog',{name:'Designs'});
 await library.getByRole('button',{name:/^Pulse instrument-r1$/}).waitFor();
 assert.equal(await page.evaluate(async()=>(await Frame.project.listDurable()).length),1);
});
test('saved viewport, state and input values resume with the browser draft',async t=>{
 const page=await pageFor(t);
 await page.evaluate(()=>{
  Frame.agent.setViewport('instrument',{width:360,height:740});
  Frame.agent.setState('instrument','error');Frame.agent.setValue('instrument','frequency','128');
 });
 await page.reload();await page.evaluate(id=>Frame.agent.selectDesign(id),'instrument');
 assert.deepEqual(await page.evaluate(()=>Frame.currentViewport('instrument')),{width:360,height:740});
 assert.equal(await page.evaluate(()=>Frame.currentState('instrument')),'error');
 assert.equal(await page.evaluate(()=>Frame.agent.getValues('instrument').frequency),'128');
});

test('view and context pickers scope options by screen and viewport, and restore the selection',async t=>{
 const page=await pageFor(t);
 await page.evaluate(()=>{
  const id='instrument',doc=Frame.agent.getDocument(id);
  const {states,...base}=doc;
  Frame.agent.updateDocument({...base,revisionId:'grouped-r1',views:[
   {id:'issues',label:'Issues',contexts:[
    {id:'default',label:'Browse',overrides:states.default},
    {id:'loading',label:'Selected rows',overrides:states.loading}
   ]},
   {id:'activity',label:'Activity',contexts:[{id:'error',label:'Unavailable',overrides:states.error}]}
  ],viewportLayouts:{maxWidth:500,narrow:['default'],wide:['default','loading','error']}});
 });
 const view=page.getByRole('combobox',{name:'Screen',exact:true}),context=page.locator('#context-picker');
 const viewport=page.getByRole('combobox',{name:'Viewport',exact:true});
 const desktop=await viewport.inputValue();
 assert.equal(await view.inputValue(),'issues');
 assert.deepEqual(await context.locator('option').allTextContents(),['Browse','Selected rows']);
 assert.equal(await page.locator('#state-picker').isHidden(),true);
 await view.selectOption('activity');
 assert.equal(await context.isHidden(),true);
 assert.equal(await page.evaluate(()=>Frame.currentState('instrument')),'error');
 await view.selectOption('issues');
 assert.equal(await context.inputValue(),'default');
 await context.selectOption('loading');
 await viewport.selectOption('360×740');
 assert.deepEqual(await view.locator('option').allTextContents(),['Issues']);
 assert.equal(await context.isHidden(),true);
 assert.equal(await page.evaluate(()=>Frame.currentState('instrument')),'default');
 await viewport.selectOption(desktop);
 assert.equal(await context.inputValue(),'loading');
 await page.reload();
 await page.evaluate(()=>Frame.agent.selectDesign('instrument'));
 assert.equal(await view.inputValue(),'issues');
 assert.equal(await context.inputValue(),'loading');
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
 await page.evaluate(id=>Frame.agent.selectDesign(id),'starter');
 await page.evaluate(id=>Frame.agent.selectDesign(id),'instrument');
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').elements.find(n=>n.id==='status').text),'RECOVERABLE DRAFT');
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalProjectSave;});
 assert.equal(await page.locator('.project-warning').isVisible(),true);
 await page.locator('.project-menu summary').click({timeout:5000});
 await page.locator('#retry-project-save').click({timeout:5000});
 assert.equal(await page.locator('#project-save-notice').textContent(),'');
 await page.reload();await page.evaluate(id=>Frame.agent.selectDesign(id),'instrument');
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').elements.find(n=>n.id==='status').text),'RECOVERABLE DRAFT');
});
test('unreadable saved project archives are protected while in-memory edits remain exportable',async t=>{
 const page=await pageFor(t);
 await page.evaluate(()=>localStorage.setItem('frame-project-v1:instrument','unreadable backup'));
 await page.reload();await page.evaluate(id=>Frame.agent.selectDesign(id),'instrument');
 await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'status',patch:{text:'IN MEMORY'}}]));
 await page.locator('.project-menu summary').click({timeout:5000});
 await page.locator('#retry-project-save').click({timeout:5000});
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
 await page.reload();await page.evaluate(id=>Frame.agent.selectDesign(id),'instrument');
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').revisionId),'instrument-r2');
 await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'status',patch:{text:'NEW SOURCE DRAFT'}}]));
 await page.reload();await page.evaluate(id=>Frame.agent.selectDesign(id),'instrument');
 assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').elements.find(n=>n.id==='status').text),'NEW SOURCE DRAFT');
 assert.equal(await page.evaluate(()=>Frame.revisions.list('instrument').length),3);
});

test('zoom repaints the canvas at a bounded resolution while keeping design coordinates',async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  await Frame.agent.renderReady();const canvas=document.getElementById('design');const before={width:canvas.width,height:canvas.height};
  const original=Frame.agent.inspect('instrument',{elementId:'run'})[0].bounds;
  Frame.view.set({zoom:4,panX:0,panY:0});await Frame.agent.renderReady();const after={width:canvas.width,height:canvas.height};
  Frame.view.set({zoom:8,panX:0,panY:0});await Frame.agent.renderReady();const max={width:canvas.width,height:canvas.height};
  return {before,after,max,original,next:Frame.agent.inspect('instrument',{elementId:'run'})[0].bounds};
 });
 assert.ok(result.after.width>result.before.width);assert.ok(result.after.height>result.before.height);
 assert.ok(result.max.width<=8192&&result.max.height<=8192&&result.max.width*result.max.height<=16777216);
 assert.deepEqual(result.original,result.next);
});
