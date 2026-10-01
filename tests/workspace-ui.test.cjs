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
