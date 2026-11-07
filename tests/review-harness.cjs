const {before,after} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const {readFixturePage} = require('../examples/fixture-page.cjs');
function reviewHarness() {
  let browser,server,url;
  const root=path.resolve(__dirname,'..');
  before(async()=>{
    server=http.createServer(async(req,res)=>{
      const pathname=new URL(req.url,'http://localhost').pathname;
      const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFixturePage(file));}
      catch{res.writeHead(404).end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({executablePath:process.env.FRAME_BROWSER_PATH||undefined});
  });
  after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
  return async(t,{width=1440,height=1000,design='instrument'}={})=>{
    const context=await browser.newContext({viewport:{width,height},acceptDownloads:true});
    t.after(()=>context.close());const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    t.after(()=>assert.deepEqual(errors,[],'no uncaught browser errors'));
    await page.goto(url);await page.evaluate(id=>Frame.agent.selectDesign(id),design);
    return page;
  };
}
module.exports={reviewHarness};
