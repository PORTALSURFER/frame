// CPU geometry/command benchmark, not a GPU/frame-rate acceptance test.
const {performance} = require('node:perf_hooks');
const path = require('node:path');
const os = require('node:os');
const model = require(process.argv[2] ? path.resolve(process.argv[2]) : '../design-document.js');
const doc = {version:1,id:'scale',name:'scale',revisionId:'r1',width:1900,height:1120,elements:[]};
for(let i=0;i<7000;i++) doc.elements.push({id:'n'+i,type:i%7===0?'chart':'container',
 bounds:{x:i%100*19,y:Math.floor(i/100)*16,width:18,height:14},style:{stroke:'none'},
 ...(i%7===0?{points:Array.from({length:32},(_,j)=>[j/2,Math.sin(j)*4+7])}:{})});
const context = new Proxy({}, {get:(_,key)=>key==='measureText'?()=>({width:0}):()=>{},set:()=>true});
const results={};
for(const [name,fn] of [['inspect',()=>model.inspect(doc)],['renderCommands',()=>model.render(context,doc)]]) {
 for(let i=0;i<3;i++)fn();
 const samples=[];
 for(let i=0;i<15;i++){const start=performance.now();fn();samples.push(performance.now()-start);}
 samples.sort((a,b)=>a-b);results[name]={medianMs:samples[7],p95Ms:samples[14]};
}
console.log(JSON.stringify({node:process.version,cpu:os.cpus()[0].model,platform:process.platform,arch:process.arch,
 elements:7000,chartPoints:32000,warmup:3,samples:15,results},null,2));
