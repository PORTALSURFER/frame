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
