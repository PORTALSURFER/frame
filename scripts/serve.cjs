// Stable loopback origin for Frame; never silently select another port/storage origin.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
  '.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.md':'text/plain; charset=utf-8'};
function createServer(root = path.resolve(__dirname, '..')) {
  const ready = fs.realpath(root);
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    try {
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{Allow:'GET, HEAD'}).end(); return; }
      const base = await ready, pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      if (pathname.includes('\0') || pathname.split(/[\\/]/).some(part=>part.startsWith('.'))) { res.writeHead(403).end(); return; }
      const file = await fs.realpath(path.resolve(base,'.'+(pathname==='/'?'/index.html':pathname)));
      if (!file.startsWith(base+path.sep)) { res.writeHead(403).end(); return; }
      const type=types[path.extname(file).toLowerCase()];
      if (!type) { res.writeHead(403).end(); return; }
      const stat=await fs.stat(file);
      if (!stat.isFile()) { res.writeHead(404).end(); return; }
      const etag='W/"'+stat.size+'-'+stat.mtimeMs+'-'+stat.ctimeMs+'"';
      res.setHeader('Cache-Control','no-cache');res.setHeader('ETag',etag);
      if(req.headers['if-none-match']===etag){res.writeHead(304).end();return;}
      // Read before publishing response headers; failed reads remain recoverable.
      const bytes=await fs.readFile(file);
      res.writeHead(200,{'Content-Type':type,'Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);
    } catch(error) { res.writeHead(error.code==='ENOENT'?404:400).end(); }
  });
}
if(require.main===module){
  const port=Number(process.env.FRAME_PORT||8765);
  if(!Number.isInteger(port)||port<1||port>65535){console.error('FRAME_PORT must be 1 to 65535');process.exitCode=1;}
  else {
    const server=createServer();
    server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Frame port ${port} is already in use. Reuse that Frame server or stop it before retrying; the storage origin has not changed.`:error.message);process.exitCode=1;});
    server.listen(port,'127.0.0.1',()=>console.log(`Frame: http://127.0.0.1:${port}/ — keep this address to retain browser project storage`));
  }
}
module.exports={createServer};
