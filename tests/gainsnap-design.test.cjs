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
 await page.locator('#state-picker').selectOption('matched');await page.getByRole('button',{name:'RESTART',exact:true}).click();assert.equal(await page.evaluate(()=>Frame.currentState('gainsnap-sift-hardware')),'remeasuring');assert.equal(await page.getByRole('textbox',{name:'Gain in dB',exact:true}).inputValue(),'+6.0');
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
