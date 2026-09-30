// Run create → render → human note → agent edit → checks → revision review → handoff.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),output=process.env.FRAME_OUTPUT_DIR||path.join(root,'artifacts');
 await fs.mkdir(output,{recursive:true});
 const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,name=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!name.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(name));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.FRAME_BROWSER_PATH||undefined});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('#design-picker').selectOption('instrument');
  await page.evaluate(()=>Frame.agent.renderReady());
  async function image(name,feedback=false) {
   const bytes=await page.evaluate(async feedback=>Array.from(new Uint8Array(await (await Frame.agent.exportImage({feedback})).blob.arrayBuffer())),feedback);
   await fs.writeFile(path.join(output,name),Buffer.from(bytes));
  }
  await image('before.png');
  await page.evaluate(()=>Frame.review.approve('instrument'));
  // This uses the same Note UI a person uses, rather than injecting feedback.
  await page.locator('#tool-note').click();
  const bounds=await page.locator('#board').boundingBox();
  await page.mouse.click(bounds.x+284*bounds.width/1000,bounds.y+548*bounds.height/700);
  await page.locator('#note-text').fill('Give the analysis and reset controls more space.');
  await page.locator('#note-save').click();
  const feedback=await page.evaluate(()=>Frame.agent.getFeedback());
  assert.equal(feedback.notes[0].elementAnchor.elementId,'run');
  const report=await page.evaluate(async()=>{
   const before=Frame.agent.getDocument('instrument').revisionId;
   const changed=Frame.agent.applyEdits('instrument',[{op:'update',id:'reset',patch:{bounds:{x:532}}}]);
   const comparison=Frame.revisions.compare('instrument',before,changed.revisionId);
   const visual=await Frame.review.compare('instrument',{maxChangedRatio:0});
   const scenarios=await Frame.review.run('instrument',[
    {name:'Desktop analysis',viewport:{width:1000,height:700},state:'default',actions:[{type:'click',elementId:'run'}],expectedState:'loading'},
    {name:'Phone ready',viewport:{width:360,height:740},state:'default',expectedState:'default'}
   ]);
   Frame.feedback.setStatus(Frame.agent.getFeedback().notes[0].id,'resolved');
   return {comparison,visual,scenarios,feedback:Frame.agent.getFeedback(),project:Frame.project.export('instrument')};
  });
  assert.equal(report.visual.passed,false);
  assert.ok(report.scenarios.every(s=>s.passed));
  assert.ok(report.scenarios.every(s=>s.visual.issues.length===0),JSON.stringify(report.scenarios.map(s=>s.visual.issues)));
  await image('after.png');await image('after-feedback.png',true);
  await fs.writeFile(path.join(output,'instrument.frame.json'),JSON.stringify(report.project,null,2));
  await fs.writeFile(path.join(output,'feedback.json'),JSON.stringify(report.feedback,null,2));
  await fs.writeFile(path.join(output,'review.json'),JSON.stringify({...report,project:undefined},null,2));
  process.stdout.write('Workflow passed. Artifacts: '+output+'\n');
 } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
