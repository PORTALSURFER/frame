const {test} = require('node:test');
const assert = require('node:assert/strict');
const model = require('../design-document.js');
test('inspection preserves ordered children and chart commands honor resized bounds',()=>{
 const chart={version:1,id:'chart',name:'chart',revisionId:'r1',width:100,height:100,elements:[
  {id:'parent',type:'container',bounds:{x:0,y:0,width:100,height:100},style:{fill:'none',stroke:'none'}},
  {id:'curve',parentId:'parent',type:'chart',bounds:{x:0,y:0,width:10,height:10},responsive:{width:'50%',height:'50%'},points:[[0,0],[10,10]]},
  {id:'line',parentId:'parent',type:'line',bounds:{x:1,y:1,width:10,height:10},points:[[0,0],[10,10]]}]};
 assert.deepEqual(model.inspect(chart)[0].children,['curve','line']);
 const points=[];
 const context=new Proxy({}, {get:(_,key)=>['moveTo','lineTo'].includes(key)?(...args)=>points.push([key,...args]):()=>{},set:()=>true});
 model.render(context,chart);
 assert.deepEqual(points,[['moveTo',0,0],['lineTo',50,50],['moveTo',1,1],['lineTo',11,11]]);
});
const doc = {version:1,id:'demo',name:'Demo',revisionId:'r1',width:800,height:600,states:{default:{},loading:{label:{text:'Loading'}}},elements:[
 model.components.container('panel',{x:20,y:20,width:600,height:300},{responsive:{width:'90%'}}),
 model.components.text('label',{x:10,y:10,width:100,height:30},{parentId:'panel',text:'Ready'}),
 model.components.button('run',{x:10,y:60,width:100,height:40},{parentId:'panel',text:'Run',action:{type:'set-state',state:'loading'}})
]};
test('hierarchical responsive layout resolves logical bounds and named state overrides',()=>{
 model.validate(doc);
 const nodes=model.layout(doc,{width:320,height:600},'loading');
 assert.equal(nodes[0].bounds.width,288);
 assert.equal(nodes[1].bounds.x,30);
 assert.equal(nodes[1].text,'Loading');
 assert.deepEqual(model.hitTest(nodes,40,90).map(n=>n.id),['run','panel']);
});
test('editing is atomic, retains unrelated identities, and removes descendant state entries',()=>{
 const edited=model.edit(doc,[{op:'update',id:'label',patch:{text:'Updated',bounds:{x:30}}}]);
 assert.equal(edited.elements[1].bounds.y,10);
 assert.equal(edited.elements[2].id,'run');
 assert.equal(doc.elements[1].text,'Ready');
 assert.notEqual(edited.revisionId,doc.revisionId);
 assert.throws(()=>model.edit(doc,[{op:'update',id:'label',patch:{text:'Changed'}},{op:'create',element:doc.elements[1]}]));
 assert.equal(doc.elements[1].text,'Ready');
 const removed=model.edit(doc,[{op:'remove',id:'panel'}]);
 assert.equal(removed.elements.length,0);assert.deepEqual(removed.states.loading,{});
});
test('document validation rejects cycles, missing parents, duplicate IDs and unlabelled controls',()=>{
 for(const mutate of [d=>d.elements[0].parentId='label',d=>d.elements[1].parentId='missing',d=>d.elements[1].id='run',d=>delete d.elements[2].label,d=>d.elements[0].bounds.width=-1,d=>d.states.loading.missing={text:'x'}]) {
  const invalid=structuredClone(doc);mutate(invalid);assert.throws(()=>model.validate(invalid));
 }
});

test('opt-in device flow reflows fixed children and equal grid columns with viewport changes',()=>{
 const base={version:1,id:'flow',name:'Flow',revisionId:'r1',width:200,height:100,elements:[
  {id:'parent',type:'container',bounds:{x:0,y:0,width:200,height:100},responsive:{width:'100%'},flow:{kind:'wrap',gap:4}},
  ...[0,1,2].map(i=>({id:'c'+i,type:'container',parentId:'parent',bounds:{x:0,y:0,width:80,height:20}}))]};
 model.validate(base);const wide=model.layout(base,{width:260,height:100}),narrow=model.layout(base,{width:160,height:100});
 assert.deepEqual(wide.slice(1).map(n=>[n.bounds.x,n.bounds.y]),[[0,0],[84,0],[168,0]]);
 assert.deepEqual(narrow.slice(1).map(n=>[n.bounds.x,n.bounds.y]),[[0,0],[0,24],[0,48]]);
 const grid=structuredClone(base);grid.elements[0].flow={kind:'grid',columns:2};
 const nodes=model.layout(grid,{width:200,height:100});assert.deepEqual(nodes.slice(1).map(n=>[n.bounds.x,n.bounds.y,n.bounds.width]),[[0,0,80],[102,0,80],[0,24,80]]);
 assert.throws(()=>model.validate({...base,elements:[{...base.elements[0],flow:{kind:'grid',columns:0}}]}),/flow/);
});
test('flow spacing resolves shared document tokens and rejects missing tokens',()=>{
 const doc={version:1,id:'tokens',name:'Tokens',revisionId:'r1',width:100,height:100,tokens:{spacing:{device:4}},elements:[
  {id:'p',type:'container',bounds:{x:0,y:0,width:100,height:50},flow:{kind:'row',gap:'device'}},
  {id:'a',type:'text',parentId:'p',bounds:{x:0,y:0,width:10,height:10},text:'a'},
  {id:'b',type:'text',parentId:'p',bounds:{x:0,y:0,width:10,height:10},text:'b'}]};
 model.validate(doc);assert.equal(model.layout(doc)[2].bounds.x,14);
 doc.tokens.spacing.device=8;assert.equal(model.layout(doc)[2].bounds.x,18);
 delete doc.tokens.spacing.device;assert.throws(()=>model.validate(doc),/flow/);
});
test('wrapped device row preserves native fixture ordering and heights at wide and narrow widths',()=>{
 const doc={version:1,id:'native-fixture',name:'Native fixture',revisionId:'r1',width:360,height:100,elements:[
  {id:'parent',type:'container',bounds:{x:0,y:0,width:360,height:100},responsive:{width:'100%'},flow:{kind:'wrap',gap:4}},
  ...['a','b','c'].map(id=>({id,type:'container',parentId:'parent',bounds:{x:0,y:0,width:48,height:40}}))]};
 for(const width of [360,120]){const nodes=model.layout(doc,{width,height:100}).slice(1);assert.equal(nodes[0].bounds.y,nodes[1].bounds.y);assert.equal(nodes[2].bounds.y>nodes[1].bounds.y,width<200);for(const n of nodes){assert.equal(n.bounds.height,40);assert.ok(n.bounds.x>=0&&n.bounds.x+n.bounds.width<=width)}}
});
test('device split distributes remaining row width to equal flexible panes',()=>{
 const doc={version:1,id:'split',name:'Split',revisionId:'r1',width:120,height:60,elements:[
 {id:'p',type:'container',bounds:{x:0,y:0,width:120,height:40},responsive:{width:'100%'},flow:{kind:'row'}},
 ...['a','b'].map(id=>({id,type:'container',parentId:'p',flowGrow:1,bounds:{x:0,y:0,width:0,height:40}}))]};
 model.validate(doc);for(const width of [120,360]){const a=model.layout(doc,{width,height:60});assert.equal(a[1].bounds.width,(width-4)/2);assert.equal(a[2].bounds.x,(width+4)/2);assert.equal(a[2].bounds.width,(width-4)/2);assert.equal(a[2].bounds.height,40);}
 const broken=structuredClone(doc);broken.elements[0].flow.kind='wrap';assert.throws(()=>model.validate(broken),/flowGrow/);
});
test('flow excludes hidden siblings and normalizes large finite growth weights',()=>{
 const d={version:1,id:'grow',name:'grow',revisionId:'r1',width:100,height:50,states:{default:{},hidden:{a:{visible:false}}},elements:[
  {id:'p',type:'container',flow:{kind:'row',gap:0},bounds:{x:0,y:0,width:100,height:50}},
  ...['a','b'].map(id=>({id,parentId:'p',type:'container',flowGrow:1e308,bounds:{x:0,y:0,width:0,height:50}}))]};
 model.validate(d);
 assert.deepEqual(model.layout(d).slice(1).map(n=>n.bounds.width),[50,50]);
 const hidden=model.layout(d,undefined,'hidden');
 assert.equal(hidden[2].bounds.width,100);assert.equal(hidden[2].bounds.x,0);
});
