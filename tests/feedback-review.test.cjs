const {test}=require('node:test');
const assert=require('node:assert/strict');
const codec=require('../feedback.js');
const {reviewHarness}=require('./review-harness.cjs');
const open=reviewHarness();
const design={id:'demo',width:800,height:600,revisionId:'r1'};
test('review metadata roundtrips separately from legacy resolution and rejects contradictory decisions',()=>{
  const note={...codec.metadata('note',design),anchor:[10,20],text:'Give this more space',reviewedState:'default'};
  const proposed=codec.propose(note,'r2','Increased spacing');
  assert.equal(proposed.status,'open');assert.equal(proposed.review.decision,'pending');assert.equal(note.review,undefined);
  const accepted=codec.decide(proposed,'accepted'),reopened=codec.decide(accepted,'reopened');
  for(const mark of [note,proposed,accepted,reopened]){
    const doc=codec.document(design,[],[mark]);assert.deepEqual(codec.read(JSON.parse(JSON.stringify(doc)),design),doc);
    assert.equal(mark.revisionId,'r1');assert.deepEqual(mark.anchor,[10,20]);
  }
  assert.throws(()=>codec.decide(note,'accepted'),/Propose/);
  for(const mutation of [r=>r.revisionId='',r=>r.summary='',r=>r.proposedAt=null,r=>r.decision='done',r=>r.decidedAt='invalid']){
    const mark=structuredClone(proposed);mutation(mark.review);assert.throws(()=>codec.validate(codec.document(design,[],[mark]),design));
  }
  assert.throws(()=>codec.validate(codec.document(design,[],[{...accepted,status:'open'}]),design),/review/);
  assert.equal(codec.read([{points:[]}],design).notes.length,0,'legacy imports do not invent review decisions');
});
test('proposal, acceptance and reopening preserve context through undo, reload and portable export',async t=>{
  const page=await open(t);
  const id=await page.evaluate(()=>{
    const marks=Frame.agent.getFeedback(),note={...FrameFeedback.metadata('note',Frame.designs.get('instrument')),anchor:[40,40],text:'Give this more space',reviewedState:'default',elementAnchor:{elementId:'title',offset:[16,16]}};
    marks.notes.push(note);Frame.projectBridge.importFeedback(marks);
    Frame.agent.applyEdits('instrument',[{op:'update',id:'title',patch:{text:'Spacious title'}}]);
    Frame.feedback.propose(note.id,{revisionId:Frame.agent.getDocument('instrument').revisionId,summary:'Updated title'});return note.id;
  });
  const proposed=await page.evaluate(id=>Frame.feedback.list().find(mark=>mark.id===id),id);
  assert.equal(proposed.status,'open');assert.equal(proposed.review.decision,'pending');assert.equal(proposed.revisionId,'instrument-r1');
  await assert.rejects(page.evaluate(id=>Frame.feedback.propose(id,{revisionId:'unknown',summary:'No such revision'}),id),/Unknown revision/);
  assert.deepEqual(await page.evaluate(id=>Frame.feedback.list().find(mark=>mark.id===id),id),proposed);
  await page.evaluate(id=>Frame.feedback.accept(id),id);
  assert.equal(await page.evaluate(id=>Frame.feedback.list().find(mark=>mark.id===id).review.decision,id),'accepted');
  await page.locator('#undo').click();
  assert.deepEqual(await page.evaluate(id=>Frame.feedback.list().find(mark=>mark.id===id),id),proposed);
  await page.locator('#redo').click();await page.reload();await page.evaluate(()=>Frame.agent.selectDesign('instrument'));
  assert.equal(await page.evaluate(id=>Frame.project.export().feedback.notes.find(mark=>mark.id===id).review.decision,id),'accepted');
  await page.evaluate(id=>Frame.feedback.reopen(id),id);
  const reopened=await page.evaluate(id=>Frame.feedback.list().find(mark=>mark.id===id),id);
  assert.equal(reopened.status,'open');assert.equal(reopened.review.decision,'reopened');assert.equal(reopened.review.revisionId,proposed.review.revisionId);
  await page.evaluate(id=>Frame.feedback.setStatus(id,'resolved'),id);
  assert.equal(await page.evaluate(id=>Frame.feedback.list().find(mark=>mark.id===id).review.decision,id),'pending','legacy resolution is not acceptance');
});
