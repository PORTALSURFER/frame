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
test('GainSnap Sift Hardware study preserves compact controls, state previews, editable inputs and exports',async t=>{
 const context=await browser.newContext({viewport:{width:1100,height:1000}});t.after(()=>context.close());const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);await page.locator('#design-picker').selectOption('gainsnap-sift-hardware');
 const doc=await page.evaluate(()=>Frame.agent.getDocument('gainsnap-sift-hardware'));
 assert.equal(doc.revisionId,'gainsnap-sift-hardware-r4');
 const node=id=>doc.elements.find(n=>n.id===id);
 assert.ok(node('scale-0').bounds.x+node('scale-0').bounds.width<node('meter-bed').bounds.x);
 for(const id of ['target-value','gain-value'])assert.ok(node(id).bounds.width<=56&&node(id).bounds.height<=24);
 for(const id of ['target-label','gain-label','gain-unit'])assert.equal(node(id).visible,false);
 assert.ok(node('gain-knob').bounds.y>=266);
 assert.ok(node('gain-value').bounds.y+node('gain-value').bounds.height<=node('display').bounds.y+node('display').bounds.height-8);
 assert.ok(node('gain-value').bounds.y>node('gain-knob').bounds.y+node('gain-knob').bounds.height);
 assert.equal(node('brand').style.fontSize,node('title').style.fontSize);
 assert.equal(node('brand-slash').text,'/');assert.equal(node('version').text,'v0.1.3');
 assert.equal(node('output-label').bounds.x+node('output-label').bounds.width/2,node('meter-bed').bounds.x+node('meter-bed').bounds.width/2);
 assert.equal(node('output-label').style.textAlign,'center');
 for(const state of ['default','manual','peak','held'])assert.equal(doc.states[state].status.visible,false);
 assert.equal(node('restart').bounds.y,node('match').bounds.y);
 assert.ok(node('restart').bounds.width<node('match').bounds.width);
 assert.equal(node('restart').label,'Restart matching');
 assert.ok(node('restart-icon').points.length>20);
 for(let i=0;i<3;i++)assert.ok(node('activity-'+i).bounds.y>=node('target-value').bounds.y+node('target-value').bounds.height+6);
 assert.ok(node('meter-bed').bounds.x<node('gain-knob').bounds.x);
 assert.ok(node('meter-bed').bounds.height>=280);
 assert.ok(node('gain-knob').bounds.width<=48);
 assert.equal(node('top-insert').bounds.y,0);
 assert.equal(node('bottom-insert').bounds.y+node('bottom-insert').bounds.height,doc.height);
 assert.ok(node('gain-arrow').bounds.x>node('meter-bed').bounds.x+node('meter-bed').bounds.width);
 assert.deepEqual(await page.evaluate(()=>Frame.revisions.list('gainsnap-sift-hardware').map(r=>r.revisionId)),['gainsnap-sift-hardware-r1','gainsnap-sift-hardware-r2','gainsnap-sift-hardware-r3','gainsnap-sift-hardware-r4']);
 assert.equal(doc.width,200);assert.equal(doc.height,424);assert.equal(doc.styleguideId,'sift-hardware');assert.equal(await page.locator('#styleguide-picker').inputValue(),'sift-hardware');
 for(const state of Object.keys(doc.states)){
 await page.evaluate(state=>Frame.agent.setState('gainsnap-sift-hardware',state),state);
 const controls=(await page.evaluate(()=>Frame.agent.inspect('gainsnap-sift-hardware'))).filter(n=>['button','input'].includes(n.type)&&n.visible!==false);
 for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
  const a=controls[i].bounds,b=controls[j].bounds;
  assert.ok(Math.max(b.x-a.x-a.width,a.x-b.x-b.width,b.y-a.y-a.height,a.y-b.y-b.height)>=8,controls[i].id+' crowds '+controls[j].id);
 }
 }
 await page.locator('#state-picker').selectOption('default');
 await page.locator('#tool-interact').click();await page.getByRole('button',{name:'MATCH',exact:true}).click();assert.equal(await page.evaluate(()=>Frame.currentState('gainsnap-sift-hardware')),'listening');
 await page.locator('#state-picker').selectOption('matched');await page.getByRole('button',{name:'MATCH',exact:true}).click();assert.equal(await page.evaluate(()=>Frame.currentState('gainsnap-sift-hardware')),'held');assert.equal(await page.getByRole('textbox',{name:'Gain in dB',exact:true}).inputValue(),'+6.0');
 await page.locator('#state-picker').selectOption('matched');await page.getByRole('button',{name:'Restart matching',exact:true}).click();assert.equal(await page.evaluate(()=>Frame.currentState('gainsnap-sift-hardware')),'remeasuring');assert.equal(await page.getByRole('textbox',{name:'Gain in dB',exact:true}).inputValue(),'+6.0');
 await page.getByRole('textbox',{name:'Target in dBFS',exact:true}).fill('-14.0');assert.equal(await page.getByRole('textbox',{name:'Target in dBFS',exact:true}).inputValue(),'-14.0');
 await page.getByRole('textbox',{name:'Target in dBFS',exact:true}).fill('−12.0');
 const output=path.join(root,'artifacts/gainsnap-sift-hardware');await fs.mkdir(output,{recursive:true});
 for(const state of Object.keys(doc.states)){
  await page.locator('#state-picker').selectOption(state);await page.evaluate(()=>Frame.agent.renderReady());
  const png=await page.evaluate(async()=>Array.from(new Uint8Array(await (await Frame.agent.exportImage({scale:3})).blob.arrayBuffer())));await fs.writeFile(path.join(output,state+'.png'),Buffer.from(png));
 }
 await fs.writeFile(path.join(output,'gainsnap-sift-hardware.frame.json'),await page.evaluate(()=>JSON.stringify(Frame.project.export('gainsnap-sift-hardware'),null,2)));
 assert.deepEqual(errors,[]);
});
