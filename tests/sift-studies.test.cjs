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
test('Sift guide studies retain old revisions and expose a refined guide-driven pair with independent geometry, idle states and persistent restoration',async t=>{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});t.after(()=>context.close());
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);await page.locator('#design-picker').selectOption('sift-style-studies');
 assert.deepEqual(errors,[]);
 const history=await page.evaluate(()=>Frame.revisions.list('sift-style-studies'));
 assert.deepEqual(history.map(r=>r.revisionId),['sift-technical-futurist-r1','sift-hardware-r2','sift-technical-futurist-r3','sift-hardware-r4','sift-hardware-r5']);
 const output=path.join(root,'artifacts/sift-style-studies');await fs.mkdir(output,{recursive:true});
 for(const [revision,guide] of [['sift-technical-futurist-r1','technical-futurist'],['sift-hardware-r2','sift-hardware'],['sift-technical-futurist-r3','technical-futurist'],['sift-hardware-r4','sift-hardware'],['sift-hardware-r5','sift-hardware']]) {
  await page.locator('#revision-picker').selectOption(revision);
  assert.equal(await page.evaluate(()=>Frame.agent.getDocument('sift-style-studies').revisionId),revision);
  assert.equal(await page.locator('#styleguide-picker').inputValue(),guide);
  const doc=await page.evaluate(()=>Frame.agent.getDocument('sift-style-studies'));
  assert.equal(doc.styleguideId,guide);assert.equal(doc.assets,undefined);
  if(revision.endsWith('r5')) {
   const controls=doc.elements.filter(n=>n.type==='button');
   const insets=doc.elements.filter(n=>['top-metal','bottom-metal','top-lip','bottom-lip'].includes(n.id));
   const gap=(a,b)=>Math.max(b.x-a.x-a.width,a.x-b.x-b.width,b.y-a.y-a.height,a.y-b.y-b.height);
   for(const control of controls)for(const inset of insets)assert.ok(gap(control.bounds,inset.bounds)>=8,control.id+' crowds '+inset.id);
   for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)assert.ok(gap(controls[i].bounds,controls[j].bounds)>=8,controls[i].id+' crowds '+controls[j].id);
   const textGap=await page.evaluate(()=>{
    const doc=Frame.agent.getDocument('sift-style-studies'),ctx=document.createElement('canvas').getContext('2d');
    return ['takes','division'].map(id=>{
     const field=doc.elements.find(n=>n.id===id),arrow=doc.elements.find(n=>n.id===id+'-chevron');
     ctx.font=field.style.fontSize+'px '+doc.tokens.typography.family;
     return {gap:arrow.bounds.x-field.bounds.x-field.style.padding-ctx.measureText(field.text).width,right:field.bounds.x+field.bounds.width-arrow.bounds.x-arrow.bounds.width};
    });
   });
   for(const field of textGap){assert.ok(field.gap>=8);assert.ok(field.right>=8);}
  }
  if(revision.endsWith('r3')||revision.endsWith('r4')) {
   assert.ok(!doc.elements.some(node=>/SYNTHETIC|STYLE PREVIEW|DESIGN STUDY|INSTRUMENTATION|Capture, select/.test(node.text||'')));
   assert.ok(doc.elements.filter(node=>node.id.startsWith('overview-wave')&&node.type==='container').length<=2);
  }
  for(const state of ['default','idle']) {
   await page.evaluate(state=>Frame.agent.setState('sift-style-studies',state),state);
   await page.evaluate(()=>Frame.agent.renderReady());
   const nodes=await page.evaluate(()=>Frame.agent.inspect('sift-style-studies'));
   assert.equal(nodes.find(n=>n.id==='idle-message').visible,state==='idle');
   assert.equal(nodes.find(n=>n.id==='wave-0').visible,state!=='idle');
   const png=await page.evaluate(async()=>Array.from(new Uint8Array(await (await Frame.agent.exportImage()).blob.arrayBuffer())));
   await fs.writeFile(path.join(output,revision+'-'+state+'.png'),Buffer.from(png));
  }
 }
 await page.reload();await page.locator('#design-picker').selectOption('sift-style-studies');
 assert.equal(await page.locator('#revision-picker').inputValue(),'sift-hardware-r5');
 assert.equal(await page.locator('#styleguide-picker').inputValue(),'sift-hardware');
 await page.evaluate(()=>Frame.agent.setState('sift-style-studies','recording'));
 assert.equal(await page.evaluate(()=>Frame.currentState('sift-style-studies')),'recording');
 const project=await page.evaluate(()=>Frame.project.export('sift-style-studies'));
 assert.equal(project.archive.revisions.length,5);
 await fs.writeFile(path.join(output,'sift-style-studies.frame.json'),JSON.stringify(project,null,2));
 assert.deepEqual(errors,[]);
});
