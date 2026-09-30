const {test}=require('node:test'),assert=require('node:assert/strict');
const model=require('../design-document.js'),review=require('../design-review.js');
test('visual checks report bounded text, contrast, overlap, clipping and explicit exceptions',()=>{
 const doc={version:1,id:'checks',name:'Checks',revisionId:'r1',width:400,height:300,elements:[
  {id:'text',type:'text',text:'Too much text',bounds:{x:10,y:10,width:20,height:20},style:{color:'#121314'}},
  {id:'other',type:'container',bounds:{x:20,y:10,width:50,height:50}},
  {id:'outside',type:'container',bounds:{x:390,y:250,width:40,height:100}}
 ]};
 const result=review.check(doc,model.layout(doc));
 assert.ok(result.issues.some(i=>i.type==='contrast'));assert.ok(result.issues.some(i=>i.type==='text-overflow'));
 assert.ok(result.issues.some(i=>i.type==='overlap'));assert.ok(result.issues.some(i=>i.type==='clipping'));
 doc.elements[0].exceptions=['contrast','text-overflow','overlap:other'];
 assert.equal(review.check(doc,model.layout(doc)).issues.filter(i=>i.elementId==='text').length,0);
 assert.equal(review.contrast('#000000','#ffffff'),21);
});
