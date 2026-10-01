const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
let server,browser,url;
before(async()=>{
 server=http.createServer(async(req,res)=>{
  const file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.FRAME_BROWSER_PATH||undefined});
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
test('Frame redesign is a structured guide-led prototype with usable state controls and persistent feedback',async t=>{
 const context=await browser.newContext({viewport:{width:1600,height:1200}});t.after(()=>context.close());
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);await page.locator('#design-picker').selectOption('frame-workspace');
 const doc=await page.evaluate(()=>Frame.agent.getDocument('frame-workspace'));
 assert.equal(doc.styleguideId,'technical-futurist');assert.equal(doc.width,1280);assert.equal(doc.height,800);
 assert.ok(doc.elements.some(n=>n.id==='sample-wave-0'));assert.equal(doc.assets,undefined);
 assert.equal(await page.locator('#styleguide-picker').inputValue(),'technical-futurist');
 const controls=doc.elements.filter(n=>n.type==='button'&&!n.id.startsWith('sample-')&&!/^(guide|project|export|review)-/.test(n.id));
 for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
  const a=controls[i].bounds,b=controls[j].bounds;
  assert.ok(Math.max(b.x-a.x-a.width,a.x-b.x-b.width,b.y-a.y-a.height,a.y-b.y-b.height)>=8,controls[i].id+' crowds '+controls[j].id);
 }
 const board=await page.locator('#board').boundingBox();await page.mouse.move(board.x+200,board.y+180);await page.mouse.down();await page.mouse.move(board.x+260,board.y+210);await page.mouse.up();
 const stable=lines=>lines.map(({needsReview,anchorRevisionId,...mark})=>mark);
 const marks=stable(await page.evaluate(()=>Frame.agent.getFeedback().lines));
 await page.locator('[data-feedback-tool="interact"]').click();
 await page.getByRole('button',{name:'Feedback mark 1',exact:true}).click();
 assert.equal(await page.evaluate(()=>Frame.currentState('frame-workspace')),'selected');
 assert.equal(await page.getByRole('button',{name:'Resolve',exact:true}).isEnabled(),true);
 await page.getByRole('button',{name:'Resolve',exact:true}).click();
 assert.equal(await page.evaluate(()=>Frame.currentState('frame-workspace')),'resolved');
 const output=path.join(root,'artifacts/frame-workspace');await fs.mkdir(output,{recursive:true});
 for(const state of ['default','selected','empty','guide','project','export','review']) {
  await page.evaluate(state=>Frame.agent.setState('frame-workspace',state),state);
  await page.evaluate(()=>Frame.agent.renderReady());
  const png=await page.evaluate(async()=>Array.from(new Uint8Array(await (await Frame.agent.exportImage()).blob.arrayBuffer())));
  await fs.writeFile(path.join(output,state+'.png'),Buffer.from(png));
 }
 await page.evaluate(()=>Frame.agent.setState('frame-workspace','default'));
 assert.deepEqual(stable(await page.evaluate(()=>Frame.agent.getFeedback().lines)),marks);
 const project=await page.evaluate(()=>Frame.project.export('frame-workspace'));
 await fs.writeFile(path.join(output,'frame-workspace.frame.json'),JSON.stringify(project,null,2));
 await page.reload();await page.locator('#design-picker').selectOption('frame-workspace');
 assert.deepEqual(stable(await page.evaluate(()=>Frame.agent.getFeedback().lines)),marks);
 assert.deepEqual(errors,[]);
});
