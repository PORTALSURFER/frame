const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../concept-model.js');
const family=()=>({version:1,designId:'source',groups:[{id:'overview',scope:{viewId:'overview',state:'days',width:1280,height:800},chosenId:null,versions:[{id:'v1',designId:'source-v1',name:'Original',createdAt:'2026-11-07T11:00:00.000Z'}]}]});
test('concept families distinguish scope, saved version identity and the chosen alternative',()=>{
 const data=family();assert.equal(model.validate(data),data);
 data.groups[0].chosenId='v1';model.validate(data);
 assert.equal(model.sameScope(data.groups[0].scope,{viewId:'overview',state:'days',width:393,height:852}),false);
 for(const mutate of [d=>d.groups[0].chosenId='missing',d=>d.groups[0].scope.width=0,d=>d.groups.push(structuredClone(d.groups[0])),d=>d.groups[0].versions.push({...d.groups[0].versions[0],id:'v2'}),d=>d.groups[0].versions[0].designId='source']){
  const invalid=family();mutate(invalid);assert.throws(()=>model.validate(invalid));
 }
});
test('portable concept envelopes require every referenced design exactly once',()=>{
 const data=family(),bundle={format:'frame-concepts',version:1,family:data,projects:[{archive:{designId:'source'}},{archive:{designId:'source-v1'}}]};
 assert.equal(model.envelope(bundle),bundle);
 assert.throws(()=>model.envelope({...bundle,projects:bundle.projects.slice(1)}),/missing/);
 assert.throws(()=>model.envelope({...bundle,projects:[...bundle.projects,bundle.projects[0]]}),/duplicate/);
});
module.exports={family};
