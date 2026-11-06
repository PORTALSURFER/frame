const {test} = require('node:test');
const assert = require('node:assert/strict');
const codec = require('../archive-codec.js');
test('archive codec round trips Unicode, repeated content, and dictionary resets', () => {
  let seed=12345, noise='';
  for(let i=0;i<100000;i++){seed=(seed*1664525+1013904223)>>>0;noise+=String.fromCharCode(32+(seed%95));}
  for(const value of ['', 'legacy plain JSON', JSON.stringify({text:'héllø · 🎛️ −∞',values:Array(1000).fill('repeated design data')}), noise]) {
    assert.equal(codec.decompress(codec.compress(value)),value);
  }
  assert.equal(codec.decompress('{"legacy":true}'),'{"legacy":true}');
  assert.throws(()=>codec.decompress('frame-lzw-v1:'+String.fromCharCode(32767)),/Invalid compressed/);
});
test('compact archives preserve revision documents, states, ordering, and reject invalid references', () => {
  const doc={version:1,id:'d',name:'d',revisionId:'r1',width:20,height:20,states:{default:{a:{visible:true}}},elements:[{id:'a',type:'text',bounds:{x:0,y:0,width:4,height:4},text:'a'}]};
  const next=structuredClone(doc);next.revisionId='r2';
  next.views=[{id:'issues',label:'Issues',contexts:[{id:'default',label:'Browse',overrides:next.states.default}]}];
  delete next.states;
  const archive={version:1,designId:'d',sourceRevisionId:'r1',currentRevisionId:'r2',revisions:[{revisionId:'r1',document:doc},{revisionId:'r2',document:next}]};
  const packed=codec.pack(archive);
  assert.equal(packed.elements.length,1);assert.equal(packed.states.length,1);
  assert.equal(JSON.stringify(codec.unpack(JSON.parse(codec.decompress(codec.compress(JSON.stringify(packed)))))),JSON.stringify(archive));
  packed.archive.revisions[0].document.elements[0]=999;
  assert.throws(()=>codec.unpack(packed),/Invalid compact project reference/);
});
