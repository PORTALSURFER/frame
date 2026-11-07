const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createServer}=require('../scripts/serve.cjs');
test('disk concept manifests validate input and retain the winner of concurrent writes',async t=>{
 const dataDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'frame-concepts-'));
 const server=createServer(undefined,{dataDirectory});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(dataDirectory,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+server.address().port,url=origin+'/__frame/concepts/source';
 const put=data=>fetch(url,{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({expected:0,data})});
 assert.equal((await fetch(url)).status,404);
 assert.equal((await put({version:1,designId:'wrong',groups:[]})).status,400);
 const results=await Promise.all([put({version:1,designId:'source',groups:[]}),put({version:1,designId:'source',groups:[]})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const record=await (await fetch(url)).json();assert.equal(record.generation,1);assert.deepEqual(record.data.groups,[]);
});
