const {test}=require('node:test');
const assert=require('node:assert/strict');
const {reviewHarness}=require('./review-harness.cjs');
const open=reviewHarness();
test('parallel concepts keep context, documents and feedback separate and expose all versions to agents',async t=>{
 const page=await open(t);
 const created=await page.evaluate(async()=>{
  Frame.agent.setState('instrument','loading');Frame.view.set({zoom:1.25,panX:12,panY:8});
  return Frame.concepts.create({name:'Compact'});
 });
 assert.equal(await page.evaluate(()=>Frame.currentState(Frame.concepts.context().designId)),'loading');
 assert.deepEqual(await page.evaluate(()=>Frame.view.get()),{zoom:1.25,panX:12,panY:8});
 await page.locator('#tool-note').click();await page.locator('#brush').focus();await page.keyboard.press('Enter');
 await page.locator('#note-text').fill('Keep this control');await page.locator('#note-save').click();
 const result=await page.evaluate(async()=>{
  const state=await Frame.concepts.family(),original=state.group.versions[0];
  Frame.agent.applyEdits(Frame.concepts.context().designId,[{op:'update',id:'title',patch:{text:'Compact alternative'}}]);
  await Frame.concepts.select(original.id);
  const originalFeedback=Frame.agent.getFeedback();
  const unchanged=Frame.agent.getDocument('instrument').elements.find(n=>n.id==='title').text;
  const selection=Frame.concepts.context().designId,view=Frame.view.get();
  const review=await Frame.agent.concepts.review();
  return {originalFeedback,unchanged,review,selection,after:Frame.concepts.context().designId,view,afterView:Frame.view.get()};
 });
 assert.equal(result.originalFeedback.notes.length,0);assert.notEqual(result.unchanged,'Compact alternative');
 assert.equal(result.review.versions.length,2);assert.equal(result.review.versions.find(v=>v.id===created.id).feedback.notes[0].text,'Keep this control');
 assert.equal(result.selection,result.after);assert.deepEqual(result.view,result.afterView);
 await page.evaluate(id=>Frame.concepts.choose(id),created.id);
 await page.evaluate(id=>Frame.concepts.select(id),created.id);
 await page.reload();await page.evaluate(()=>Frame.project.startup.ready);
 assert.equal(await page.evaluate(async()=>(await Frame.concepts.family()).group.chosenId),created.id);
 assert.equal(await page.evaluate(()=>Frame.agent.getFeedback().notes[0].text),'Keep this control');
});
test('portable family transfer validates all projects and preserves feedback and preference',async t=>{
 const page=await open(t);
 const result=await page.evaluate(async()=>{
  const version=await Frame.concepts.create({name:'Alternate'});await Frame.concepts.choose(version.id);
  const bundle=await Frame.concepts.export();
  const id=await Frame.concepts.import(bundle,{rootId:'portable-family'});
  const state=await Frame.concepts.family();
  return {id,state,count:(await Frame.project.listDurable()).length};
 });
 assert.equal(result.id,'portable-family');assert.equal(result.state.data.groups[0].versions.length,2);
 assert.ok(result.state.data.groups[0].versions.every(v=>v.designId.startsWith('portable-family-concept-')));
 assert.equal(result.state.data.groups[0].chosenId,result.state.data.groups[0].versions[1].id);
});

test('the toolbar creates, previews and chooses scoped versions while setup stays in Designs',async t=>{
 const page=await open(t);
 assert.equal(await page.getByRole('combobox',{name:'Design guide',exact:true}).count(),0);
 await page.locator('#new-concept').click();await page.locator('#concept-name').fill('Roomier');
 await page.locator('#concept-form button[type="submit"]').click();
 await page.locator('#concept-dialog').waitFor({state:'hidden'});
 const selected=await page.locator('#concept-version').inputValue();
 assert.equal(await page.locator('#concept-version option').count(),2);
 await page.locator('#choose-concept').click();
 await page.waitForFunction(()=>document.getElementById('choose-concept').getAttribute('aria-pressed')==='true');
 await page.locator('#concept-version').focus();await page.keyboard.press('ArrowUp');
 await page.waitForFunction(()=>!Frame.concepts.busy()&&Frame.concepts.context().reference?.versionId===document.getElementById('concept-version').value);
 assert.notEqual(await page.locator('#concept-version').inputValue(),selected);
 assert.equal(await page.locator('#concept-version').evaluate(n=>n===document.activeElement),true);
 await page.locator('#state-picker').selectOption('loading');
 await page.waitForFunction(()=>Frame.concepts.context().designId==='instrument'&&Frame.currentState('instrument')==='loading');
 assert.equal(await page.locator('#concept-version').isDisabled(),true);
 await page.locator('#state-picker').selectOption('default');
 await page.waitForFunction(id=>Frame.concepts.context().reference?.versionId===id,selected);
 await page.locator('.project-menu summary').click();
 assert.equal(await page.getByRole('combobox',{name:'Design guide',exact:true}).count(),1);
});
