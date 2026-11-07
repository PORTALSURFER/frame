const {test}=require('node:test');
const assert=require('node:assert/strict');
const {reviewHarness}=require('./review-harness.cjs');
const open=reviewHarness();
test('history previews and comparison never mutate the live design, feedback, storage or view',async t=>{
  const page=await open(t);
  const before=await page.evaluate(()=>{
    const doc=Frame.agent.getDocument('instrument');doc.revisionId='named-r2';doc.metadata={revisionTitle:'Roomier transport'};
    doc.elements.find(n=>n.id==='run').text='Start playback';Frame.agent.updateDocument(doc);
    Frame.view.set({zoom:1.25,panX:20,panY:10});
    return {doc:Frame.agent.getDocument('instrument'),marks:Frame.agent.getFeedback(),view:Frame.view.get(),storage:localStorage.getItem('frame-project-v1:instrument'),epoch:Frame.projectBridge.restorationEpoch()};
  });
  await page.locator('#revision-history').click();await page.locator('#review-after').selectOption('instrument-r1');
  await page.waitForFunction(()=>document.getElementById('revision-review').dataset.rendering==='false');
  assert.equal(await page.locator('#revision-picker').inputValue(),'named-r2');
  assert.equal(await page.locator('#revision-timeline canvas').count(),2);
  assert.match(await page.locator('#revision-timeline').textContent(),/Roomier transport/);
  await page.locator('#review-overlay').check();
  const picture=await page.locator('.revision-picture').first().boundingBox();
  await page.mouse.move(picture.x+80,picture.y+80);await page.mouse.wheel(0,-150);
  await page.waitForFunction(()=>Number(document.querySelector('.revision-images').dataset.zoom)>1);
  await page.mouse.down();await page.mouse.move(picture.x+110,picture.y+100);await page.mouse.up();
  assert.equal(await page.locator('#review-before-image').getAttribute('style'),await page.locator('#review-after-image').getAttribute('style'));
  await page.locator('#close-revision-review').click();
  assert.deepEqual(await page.evaluate(()=>({doc:Frame.agent.getDocument('instrument'),marks:Frame.agent.getFeedback(),view:Frame.view.get(),storage:localStorage.getItem('frame-project-v1:instrument'),epoch:Frame.projectBridge.restorationEpoch()})),before);
  await page.locator('#revision-history').click();await page.locator('#review-after').selectOption('instrument-r1');await page.locator('#restore-history-revision').click();
  assert.equal(await page.evaluate(()=>Frame.agent.getDocument('instrument').revisionId),'instrument-r1');
  assert.equal(await page.locator('#revision-review').isVisible(),false);
  assert.equal(await page.evaluate(()=>Frame.revisions.get('instrument','named-r2').metadata.revisionTitle),'Roomier transport');
});
test('comparison falls back explicitly for missing historic states and refuses stale restoration',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{
    const doc=Frame.agent.getDocument('instrument');doc.revisionId='state-r2';doc.states.newstate={run:{text:'New state'}};Frame.agent.updateDocument(doc);Frame.agent.setState(doc.id,'newstate');
    Frame.revisionReview.open(doc.id,{beforeRevisionId:'instrument-r1'});
  });
  await page.waitForFunction(()=>document.getElementById('revision-review').dataset.rendering==='false');
  assert.match(await page.locator('#revision-review-context').textContent(),/default state/);
  await page.locator('#review-after').selectOption('instrument-r1');
  await page.evaluate(()=>Frame.agent.applyEdits('instrument',[{op:'update',id:'title',patch:{text:'Concurrent change'}}]));
  await page.locator('#restore-history-revision').click();
  assert.match(await page.locator('#revision-review-status').textContent(),/design changed during review/);
  assert.equal(await page.evaluate(()=>Frame.agent.inspect('instrument',{elementId:'title'})[0].text),'Concurrent change');
});

test('fallback revision titles stay readable and comparison includes screen-level contracts',async t=>{
  const page=await open(t);
  const result=await page.evaluate(()=>{
    const before=Frame.agent.getDocument('instrument');
    const changed=Frame.agent.applyEdits(before.id,[{op:'update',id:'run',patch:{text:'Start'}}]);
    const doc=Frame.agent.getDocument(before.id),{states,...base}=doc;
    Frame.agent.updateDocument({...base,revisionId:'screens-r3',views:[{id:'main',label:'Main',contexts:Object.entries(states).map(([id,overrides])=>({id,label:id,overrides}))}]});
    return {title:Frame.revisions.list(before.id).find(r=>r.revisionId===changed.revisionId).title,diff:Frame.revisions.compare(before.id,changed.revisionId,'screens-r3')};
  });
  assert.equal(result.title,'1 element updated');
  assert.ok(result.diff.settings.includes('views'));assert.ok(result.diff.settings.includes('states'));
});
