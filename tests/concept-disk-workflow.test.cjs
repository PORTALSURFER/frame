const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const {createServer}=require('../scripts/serve.cjs');
test('disk-backed concepts resume independent annotations and the chosen version',async t=>{
 const dataDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'frame-version-workflow-'));
 const server=createServer(undefined,{dataDirectory});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.FRAME_BROWSER_PATH||undefined});
 t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));await fs.rm(dataDirectory,{recursive:true,force:true});});
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 const version=await page.evaluate(async()=>{
  await Frame.project.startup.ready;
  Frame.registerDocument({version:1,id:'versions',name:'Versions',revisionId:'r1',width:600,height:400,elements:[Frame.components.text('title',{x:20,y:20,width:300,height:40},{text:'Original'})]});
  Frame.agent.selectDesign('versions');return Frame.concepts.create({name:'Alternative'});
 });
 const write=page.waitForResponse(r=>r.url().includes('/__frame/feedback/')&&r.request().method()==='PUT'&&r.ok());
 await page.evaluate(()=>{
  const data=Frame.agent.getFeedback();data.notes.push({...FrameFeedback.metadata('note',Frame.designs.get(data.design)),text:'Use this spacing',anchor:[100,100],reviewedState:'default'});
  Frame.projectBridge.importFeedback(data);
 });await write;
 await page.evaluate(id=>Frame.concepts.choose(id),version.id);
 await page.reload();await page.evaluate(()=>Frame.project.startup.ready);
 const result=await page.evaluate(async()=>{
  const review=await Frame.agent.concepts.review(),before=Frame.concepts.context().designId;
  return {review,before,after:Frame.concepts.context().designId,names:(await Frame.project.listDurable()).map(p=>p.name)};
 });
 assert.equal(result.review.chosenId,version.id);assert.equal(result.before,result.after);
 assert.equal(result.review.versions.find(v=>v.id===version.id).feedback.notes[0].text,'Use this spacing');
 assert.equal(result.review.versions.find(v=>v.id!==version.id).feedback.notes.length,0);
 assert.ok(result.names.includes('Versions · Alternative'));
});
