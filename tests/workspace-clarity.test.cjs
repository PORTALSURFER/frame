const {test}=require('node:test');
const assert=require('node:assert/strict');
const {reviewHarness}=require('./review-harness.cjs');
const open=reviewHarness();
test('identity and save state follow selection and acknowledged checkpoints',async t=>{
  const page=await open(t);
  assert.match(await page.locator('#workspace-title').textContent(),/Instrument/);
  assert.equal(await page.locator('#workspace-save-state').textContent(),'Saved in browser');
  await page.evaluate(()=>Frame.project.automaticCheckpoints.enable());
  await page.evaluate(()=>{
    Frame.agent.applyEdits(document.getElementById('design-picker').value,[{op:'update',id:'title',patch:{text:'Updated title'}}]);
  });
  assert.equal(await page.locator('#workspace-save-state').textContent(),'Saving…');
  await page.evaluate(()=>Frame.project.automaticCheckpoints.flush());
  assert.equal(await page.locator('#workspace-save-state').textContent(),'Saved in browser');
  await page.evaluate(()=>{
    Frame.project.writeDurable=async()=>{throw new Error('Disk unavailable');};
    return Frame.project.automaticCheckpoints.save();
  });
  assert.equal(await page.locator('#workspace-save-state').textContent(),'Needs attention');
  assert.match(await page.locator('#workspace-save-state').getAttribute('title'),/Disk unavailable/);
  await page.evaluate(()=>Frame.agent.selectDesign('starter'));
  assert.equal(await page.locator('#workspace-title').textContent(),'Starter UI');
});
test('Space-drag pans without marks and releases on keyup or focus loss',async t=>{
  const page=await open(t);await page.locator('#brush').focus();
  const marks=await page.evaluate(()=>Frame.agent.getFeedback());
  const board=await page.locator('#board').boundingBox();
  await page.keyboard.down('Space');
  await page.mouse.move(board.x+80,board.y+80);await page.mouse.down();await page.mouse.move(board.x+140,board.y+110);await page.mouse.up();await page.keyboard.up('Space');
  assert.deepEqual(await page.evaluate(()=>Frame.view.get()),{zoom:1,panX:60,panY:30});
  assert.deepEqual(await page.evaluate(()=>Frame.agent.getFeedback()),marks);
  assert.equal(await page.locator('#tool-pen').getAttribute('aria-pressed'),'true');
  await page.keyboard.down('Space');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('Space');
  assert.equal(await page.locator('#stage').evaluate(n=>n.classList.contains('space-pan')),false);
  await page.locator('#tool-note').click();await page.locator('#brush').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('#note-dialog').isVisible(),true,'keyboard note placement remains available');
  await page.locator('#note-text').fill('Two words');await page.locator('#note-text').press('End');await page.keyboard.press('Space');
  assert.equal(await page.locator('#note-text').inputValue(),'Two words ');
});
for(const width of [320,912,1600])test(`workspace identity and review controls fit at ${width}px`,async t=>{
  const page=await open(t,{width});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const stage=await page.locator('#stage').boundingBox(),header=await page.locator('.topbar').boundingBox();
  assert.ok(stage.y>=header.y+header.height);
  assert.equal(await page.getByRole('combobox',{name:'Design guide',exact:true}).count(),1);
  await page.locator('#tool-interact').click();
  assert.equal(await page.locator('#mode-annotate').getAttribute('aria-pressed'),'false');
  await page.locator('#mode-annotate').click();
  assert.equal(await page.locator('#tool-pen').getAttribute('aria-pressed'),'true');
});
