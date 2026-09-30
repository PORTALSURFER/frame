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
