const {test} = require('node:test');
const assert = require('node:assert/strict');
const model = require('../design-document.js');
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
