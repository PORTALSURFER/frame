const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../automatic-checkpoints.js');
const project=(revision='r1',text='')=>({archive:{currentRevisionId:revision},feedback:{text}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('automatic saves coalesce superseding edits and acknowledge only committed snapshots',async()=>{
 let current=project(),writes=[],acks=[];
 const controller=create({capture:()=>structuredClone(current),read:async()=>null,
  write:(snapshot,generation)=>new Promise(resolve=>writes.push({snapshot,generation,resolve})),acknowledge:snapshot=>acks.push(snapshot),delay:60000});
 const first=controller.flush();await tick();
 current=project('r2');controller.changed();const second=controller.flush();
 current=project('r3');controller.changed();const third=controller.flush();
 assert.equal(controller.status().pending,true);assert.equal(writes.length,1);
 writes[0].resolve({generation:1});await tick();
 assert.equal(writes.length,2);assert.equal(writes[1].snapshot.archive.currentRevisionId,'r3');
 assert.equal(controller.status().pending,true);assert.equal(acks.length,1);
 writes[1].resolve({generation:2});await Promise.all([first,second,third]);
 assert.equal(controller.status().state,'saved');assert.equal(controller.status().pending,false);
 assert.deepEqual(writes.map(item=>item.generation),[0,1]);assert.equal(acks.length,2);
});
test('failed writes retain pending feedback and explicit retry saves the latest snapshot',async()=>{
 let current=project(),fail=true,writes=[];
 const controller=create({capture:()=>structuredClone(current),read:async()=>null,delay:60000,
  write:async(snapshot,generation)=>{writes.push({snapshot,generation});if(fail)throw new Error('storage full');return {generation:1};}});
 await controller.flush();assert.equal(controller.status().state,'error');assert.equal(controller.status().pending,true);
 current=project('r1','feedback-only change');controller.changed();await controller.flush();assert.equal(writes.length,1);
 fail=false;await controller.retry();assert.equal(controller.status().state,'saved');
 assert.equal(writes[1].snapshot.feedback.text,'feedback-only change');assert.equal(writes[1].generation,0);
});
test('divergent checkpoints and stale write conflicts never silently retry or advance generation',async()=>{
 let writes=0;
 const initial=create({capture:()=>project(),read:async()=>({generation:4,project:project('another-session')}),write:async()=>{writes++;}});
 await initial.flush();await initial.retry();assert.equal(initial.status().state,'conflict');assert.equal(writes,0);
 const stale=create({capture:()=>project(),read:async()=>null,write:async()=>{writes++;const error=new Error('stale');error.name='ConflictError';throw error;}});
 await stale.flush();await stale.retry();assert.equal(stale.status().state,'conflict');assert.equal(writes,1);
});
test('initial read failure can be retried and disabling captures the last edit',async()=>{
 let failure=true,current=project(),stored;
 const controller=create({capture:()=>structuredClone(current),read:async()=>{if(failure)throw new Error('unavailable');return null;},
  write:async snapshot=>{stored=snapshot;return {generation:1};},delay:60000});
 await controller.flush();assert.equal(controller.status().state,'error');failure=false;
 current=project('final');controller.changed();await controller.retry();
 assert.equal(stored.archive.currentRevisionId,'final');
 current=project('disabled-final');controller.changed();await controller.disable();
 assert.equal(stored.archive.currentRevisionId,'disabled-final');assert.equal(controller.status().enabled,false);assert.equal(controller.status().pending,false);
});
