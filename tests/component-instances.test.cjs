const test=require('node:test'),assert=require('node:assert/strict');
const components=require('../component-instances.js');
const initial=()=>({version:1,id:'screen',name:'Screen',revisionId:'r1',width:400,height:200,elements:[]});
const definition=(color='#eeeeee')=>({id:'button',elements:[{id:'body',type:'container',bounds:{x:0,y:0,width:80,height:30},style:{fill:color}},{id:'label',type:'text',parentId:'body',bounds:{x:5,y:5,width:70,height:20},text:'default'}]});
test('named variants inherit master changes while instance overrides remain independent',()=>{
 const master=definition();master.variants={accent:{body:{style:{fill:'#aa3344',stroke:'#111111'}},label:{text:'accent'}}};
 let doc=components.define(initial(),master);
 doc=components.instantiate(doc,{id:'one',componentId:'button',variant:'accent',x:0,y:0,overrides:{body:{style:{stroke:'#ffffff'}}}});
 assert.equal(doc.elements[0].style.fill,'#aa3344');assert.equal(doc.elements[0].style.stroke,'#ffffff');
 assert.equal(doc.elements[1].text,'accent');
 master.variants.accent.body.style.fill='#cc5566';doc=components.define(doc,master);
 assert.equal(doc.elements[0].style.fill,'#cc5566');assert.equal(doc.elements[0].style.stroke,'#ffffff');
 assert.throws(()=>components.instantiate(doc,{id:'two',componentId:'button',variant:'missing',x:0,y:0}),/Unknown/);
 assert.throws(()=>components.define(doc,definition()),/Unknown/);
});
test('master updates all linked instances while preserving independent overrides and stable anchors',()=>{
 let doc=components.define(initial(),definition());
 doc=components.instantiate(doc,{id:'first',componentId:'button',x:10,y:20,overrides:{label:{text:'play'}}});
 doc=components.instantiate(doc,{id:'second',componentId:'button',x:120,y:20,overrides:{label:{text:'stop'}}});
 doc=components.define(doc,definition('#123456'));
 assert.equal(doc.elements.find(x=>x.id==='first--body').style.fill,'#123456');
 assert.equal(doc.elements.find(x=>x.id==='second--body').style.fill,'#123456');
 assert.equal(doc.elements.find(x=>x.id==='first--label').text,'play');
 assert.equal(doc.elements.find(x=>x.id==='second--label').text,'stop');
 assert.equal(doc.elements.find(x=>x.id==='second--body').bounds.x,120);
 assert.equal(doc.elements.find(x=>x.id==='first--label').parentId,'first--body');
});
test('refuses collisions and orphaned state, leaving the source untouched',()=>{
 let doc=components.define(initial(),definition());doc=components.instantiate(doc,{id:'first',componentId:'button',x:0,y:0});
 doc.states={default:{'first--label':{text:'selected'}}};const before=JSON.stringify(doc);
 assert.throws(()=>components.define(doc,{id:'button',elements:[definition().elements[0]]}),/orphan/);
 assert.equal(JSON.stringify(doc),before);
 assert.throws(()=>components.instantiate(doc,{id:'first',componentId:'button',x:0,y:0}),/unique/);
});
test('expanded components remain valid Frame documents and survive serialization',()=>{
 const model=require('../design-document.js');
 let doc=components.define(initial(),definition());
 doc=components.instantiate(doc,{id:'first',componentId:'button',x:4,y:8,overrides:{label:{text:'go',style:{color:'#ffffff'}}}});
 const restored=JSON.parse(JSON.stringify(doc));model.validate(restored);
 const nodes=model.layout(restored);assert.equal(nodes.find(x=>x.id==='first--label').bounds.x,9);
 assert.equal(restored.componentLibrary.instances.first.componentId,'button');
});
test('browser API publishes one definition to explicitly selected designs',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),model=require('../design-document.js');
 const docs=new Map();let serial=0;
 const frame={agent:{getDocument:id=>structuredClone(docs.get(id)),updateDocument:doc=>{model.validate(doc);docs.set(doc.id,structuredClone(doc));return doc;}}};
 const context={window:{Frame:frame,FrameDocument:model},crypto:{randomUUID:()=>String(++serial)},globalThis:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../component-instances.js'),'utf8'),context);
 for(const id of ['one','two']) {let doc={...initial(),id};doc=components.define(doc,definition());doc=components.instantiate(doc,{id:'item',componentId:'button',x:0,y:0});docs.set(id,doc)}
 frame.componentInstances.publish(definition('#112233'),['one','two']);
 assert.equal(docs.get('one').elements[0].style.fill,'#112233');assert.equal(docs.get('two').elements[0].style.fill,'#112233');
 const previous=JSON.stringify(docs.get('one'));assert.throws(()=>frame.componentInstances.publish(definition('#abcdef'),['one','missing']));assert.equal(JSON.stringify(docs.get('one')),previous);
});
test('instance-specific geometry survives a shared appearance change',()=>{
 const master={id:'dial',elements:[{id:'arc',type:'chart',bounds:{x:0,y:0,width:10,height:10},points:[[0,0],[5,5]],style:{stroke:'#111111'}}]};
 let d=components.define(initial(),master);d=components.instantiate(d,{id:'one',componentId:'dial',x:0,y:0,overrides:{arc:{points:[[0,0],[2,2]]}}});
 d=components.instantiate(d,{id:'two',componentId:'dial',x:20,y:0,overrides:{arc:{points:[[0,0],[9,9]]}}});
 master.elements[0].style.stroke='#abcdef';d=components.define(d,master);
 assert.deepEqual(d.elements[0].points,[[0,0],[2,2]]);assert.deepEqual(d.elements[1].points,[[0,0],[9,9]]);assert.equal(d.elements[1].style.stroke,'#abcdef');
});
test('instance-local bounds overrides preserve placement when the master changes',()=>{
 let doc=components.define(initial(),definition());doc=components.instantiate(doc,{id:'first',componentId:'button',x:100,y:20,overrides:{body:{bounds:{x:3,width:60}}}});
 assert.equal(doc.elements[0].bounds.x,103);assert.equal(doc.elements[0].bounds.width,60);
 doc=components.define(doc,definition('#abcdef'));assert.equal(doc.elements[0].bounds.x,103);assert.equal(doc.elements[0].bounds.width,60);
 require('../design-document.js').validate(doc);
});
