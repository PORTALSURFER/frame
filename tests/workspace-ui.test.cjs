const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');let server,browser,url;
before(async()=>{
 server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.FRAME_BROWSER_PATH||undefined});
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
test('live workspace feedback cards select, resolve, filter, undo, delete and persist actual annotations',async t=>{
 const context=await browser.newContext({viewport:{width:1280,height:800}});t.after(()=>context.close());
 const page=await context.newPage();await page.goto(url);await page.locator('#design-picker').selectOption('starter');
 const board=await page.locator('#board').boundingBox();
 await page.mouse.move(board.x+100,board.y+100);await page.mouse.down();await page.mouse.move(board.x+150,board.y+150);await page.mouse.up();
 const card=page.locator('.feedback-card');assert.equal(await card.count(),1);
 await card.click();assert.equal(await page.locator('#brush path.selected').count(),1);
 await page.locator('#resolve-selected').click();assert.equal(await card.getAttribute('data-status'),'resolved');
 await page.locator('#feedback-filter').selectOption('open');assert.equal(await card.isVisible(),false);
 assert.match(await page.locator('#feedback-empty').textContent(),/matches this filter/);
 await page.locator('#undo').click();assert.equal(await card.isVisible(),true);
 await page.reload();assert.equal(await card.count(),1);await card.click();await page.locator('#delete-selected').click();assert.equal(await card.count(),0);
 await page.locator('#undo').click();assert.equal(await card.count(),1);
 await page.locator('#tool-note').click();await page.locator('#brush').focus();await page.keyboard.press('Enter');await page.locator('#note-text').fill('Keep this control clear');await page.locator('#note-save').click();
 const note=page.locator('.feedback-card').filter({hasText:'Keep this control clear'});await note.dblclick();
 assert.equal(await page.locator('#note-dialog').isVisible(),true);assert.equal(await page.locator('#note-text').inputValue(),'Keep this control clear');await page.locator('#note-cancel').click();
});
for(const width of [320,768,1280,1600])test(`workspace controls and canvas remain separated at ${width}px`,async t=>{
 const context=await browser.newContext({viewport:{width,height:900}});t.after(()=>context.close());const page=await context.newPage();await page.goto(url);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal page overflow');
 const stage=await page.locator('#stage').boundingBox(),panel=await page.locator('.feedback-panel').boundingBox(),rail=await page.locator('.tool-rail').boundingBox();
 assert.ok(stage.width>150&&stage.height>=300,'usable canvas');
 const separate=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
 assert.ok(separate(stage,panel)&&separate(stage,rail),'panel and rail do not overlap the canvas');
 await fs.mkdir(path.join(root,'artifacts/workspace-ui'),{recursive:true});
 await page.screenshot({path:path.join(root,`artifacts/workspace-ui/workspace-${width}.png`),fullPage:true});
 if(width===1280){await page.locator('#design-picker').selectOption('sift-style-studies');await page.screenshot({path:path.join(root,'artifacts/workspace-ui/sift-workspace.png'),fullPage:true});}
 await page.locator('.project-menu summary').click();await page.locator('#import-project').click();assert.equal(await page.locator('#project-dialog').isVisible(),true);
});
test('Zebra Modular guide is complete, downloadable, and styles the host independently of canvas guides',async t=>{
 const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});t.after(()=>context.close());const page=await context.newPage();await page.goto(url);
 const source=await fs.readFile(path.join(root,'styleguides/zebra-modular.md'),'utf8');
 const before=await page.evaluate(()=>({design:Frame.selectedDesignId,guide:Frame.activeStyleguide.id}));
 assert.equal(await page.evaluate(()=>Frame.styleguides.get('zebra-modular').document),source);
 assert.match(await page.locator('.topbar').evaluate(n=>getComputedStyle(n).fontFamily),/Helvetica Neue|Arial/);
 await page.locator('#styleguide-picker').selectOption('zebra-modular');await page.locator('#view-styleguide').click();
 assert.equal(await page.locator('#styleguide-title').textContent(),'Zebra Modular');assert.equal(await page.locator('#styleguide-document').textContent(),source);
 const waiting=page.waitForEvent('download');await page.locator('#download-styleguide').click();const file=await waiting;
 assert.equal(file.suggestedFilename(),'zebra-modular.md');assert.equal(await fs.readFile(await file.path(),'utf8'),source);
 await page.locator('#close-styleguide').click();await page.locator('#styleguide-picker').selectOption(before.guide);
 assert.equal(await page.locator('.topbar').evaluate(n=>getComputedStyle(n).fontFamily),'"Helvetica Neue", Arial, system-ui, sans-serif');
});
test('wheel zoom stays anchored to the cursor, respects limits, and preserves annotations',async t=>{
 const context=await browser.newContext({viewport:{width:1400,height:1000}});t.after(()=>context.close());const page=await context.newPage();await page.goto(url);
 const board=await page.locator('#board').boundingBox();await page.mouse.move(board.x+100,board.y+100);await page.mouse.down();await page.mouse.move(board.x+160,board.y+130);await page.mouse.up();
 const marks=await page.evaluate(()=>Frame.agent.getFeedback());
 const cursor={x:board.x+board.width*.3,y:board.y+board.height*.4};await page.mouse.move(cursor.x,cursor.y);await page.mouse.wheel(0,-180);
 await page.waitForFunction(()=>Frame.view.get().zoom>1);
 const zoomed=await page.locator('#board').boundingBox();assert.ok(Math.abs((cursor.x-zoomed.x)/zoomed.width-.3)<.001);assert.ok(Math.abs((cursor.y-zoomed.y)/zoomed.height-.4)<.001);
 assert.deepEqual(await page.evaluate(()=>Frame.agent.getFeedback()),marks);
 await page.locator('#stage').dispatchEvent('wheel',{deltaY:-10000,clientX:cursor.x,clientY:cursor.y});assert.equal(await page.evaluate(()=>Frame.view.get().zoom),8);
 await page.locator('#stage').dispatchEvent('wheel',{deltaY:10000,deltaMode:1,clientX:cursor.x,clientY:cursor.y});assert.equal(await page.evaluate(()=>Frame.view.get().zoom),.25);
 await page.locator('#fit-view').click();assert.deepEqual(await page.evaluate(()=>Frame.view.get()),{zoom:1,panX:0,panY:0});
});
test('middle-drag pans over prototype controls in every mode without edits and recovers from cancellation',async t=>{
 const context=await browser.newContext({viewport:{width:1400,height:1000}});t.after(()=>context.close());const page=await context.newPage();await page.goto(url);await page.locator('#design-picker').selectOption('sift-style-studies');
 for(const mode of ['pen','note','select','interact']){
  await page.locator('#tool-'+mode).click();await page.locator('#fit-view').click();
  const bounds=await page.locator('#board').boundingBox();let point={x:bounds.x+100,y:bounds.y+100};
  if(mode==='interact'){const button=await page.locator('.prototype-control').first().boundingBox();point={x:button.x+button.width/2,y:button.y+button.height/2};}
  const state=await page.evaluate(()=>Frame.currentState('sift-style-studies'));
  await page.mouse.move(point.x,point.y);await page.mouse.down({button:'middle'});await page.mouse.move(point.x+70,point.y+40,{steps:3});await page.mouse.up({button:'middle'});
  const view=await page.evaluate(()=>Frame.view.get());assert.ok(Math.abs(view.panX-70)<.1&&Math.abs(view.panY-40)<.1,mode);
  assert.equal(await page.locator('#tool-'+mode).getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>Frame.currentState('sift-style-studies')),state);
  assert.equal(await page.locator('.feedback-card').count(),0);
 }
 const original=await page.evaluate(()=>Frame.view.get());
 await page.locator('#stage').evaluate(n=>n.addEventListener('pointerdown',e=>window.testPanPointer=e.pointerId,{once:true,capture:true}));
 const bounds=await page.locator('#stage').boundingBox();await page.mouse.move(bounds.x+100,bounds.y+100);await page.mouse.down({button:'middle'});await page.mouse.move(bounds.x+130,bounds.y+150);
 await page.evaluate(()=>document.getElementById('stage').dispatchEvent(new PointerEvent('pointercancel',{pointerId:window.testPanPointer})));
 await page.mouse.up({button:'middle'});assert.deepEqual(await page.evaluate(()=>Frame.view.get()),original);
 await page.locator('#fit-view').click();assert.equal(await page.locator('#stage').evaluate(n=>n.classList.contains('is-panning')),false);
});
for(const width of [320,1280])test(`feedback sidebar toggles, restores, and preserves feedback at ${width}px`,async t=>{
 const context=await browser.newContext({viewport:{width,height:1000}});t.after(()=>context.close());const page=await context.newPage();await page.goto(url);
 const board=await page.locator('#board').boundingBox();await page.mouse.move(board.x+board.width/3,board.y+board.height/3);await page.mouse.down();await page.mouse.move(board.x+board.width/2,board.y+board.height/2);await page.mouse.up();
 const marks=await page.evaluate(()=>Frame.agent.getFeedback());
 const before=await page.locator('#stage').boundingBox(),height=await page.evaluate(()=>document.documentElement.scrollHeight);
 const toggle=page.locator('#toggle-feedback');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#feedback-panel').isVisible(),false);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 if(width>760)assert.ok((await page.locator('#stage').boundingBox()).width>before.width+200);else assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight)<height);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.reload();assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.press('Enter');assert.equal(await page.locator('#feedback-panel').isVisible(),true);assert.deepEqual(await page.evaluate(()=>Frame.agent.getFeedback()),marks);
});
