const {test}=require('node:test');
const assert=require('node:assert/strict');
const {reviewHarness}=require('./review-harness.cjs');
const open=reviewHarness();
test('local concept manifests persist and serialize competing generation-checked writes',async t=>{
 const page=await open(t);
 const result=await page.evaluate(async()=>{
  const data={version:1,designId:'instrument',groups:[]};
  const missing=await Frame.conceptStore.read('instrument');
  const results=await Promise.allSettled([Frame.conceptStore.save(data,0),Frame.conceptStore.save(data,0)]);
  return {missing,states:results.map(r=>r.status),errors:results.filter(r=>r.status==='rejected').map(r=>r.reason.name),saved:await Frame.conceptStore.read('instrument')};
 });
 assert.equal(result.missing,null);assert.deepEqual(result.states.sort(),['fulfilled','rejected']);assert.deepEqual(result.errors,['ConflictError']);assert.equal(result.saved.generation,1);
 await page.reload();assert.equal(await page.evaluate(async()=>(await Frame.conceptStore.read('instrument')).generation),1);
});
