const {test} = require('node:test');
const assert = require('node:assert/strict');
const {reviewHarness} = require('./review-harness.cjs');
const open = reviewHarness();

test('hover waits for Up or Down before focusing and immediately previewing a choice', async t => {
  const page = await open(t), viewport = page.locator('#viewport-picker'), state = page.locator('#state-picker');
  await viewport.focus(); await state.hover();
  assert.equal(await viewport.evaluate(n => n === document.activeElement), true);
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'default');
  await page.keyboard.press('ArrowDown');
  assert.equal(await state.evaluate(n => n === document.activeElement), true);
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'loading');
  assert.notEqual(await state.evaluate(n => getComputedStyle(n).outlineStyle), 'none');
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'default');
});

test('Tab navigation and moving the pointer away release the hovered picker', async t => {
  const page = await open(t), viewport = page.locator('#viewport-picker'), state = page.locator('#state-picker');
  await viewport.focus(); await state.hover();
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('ArrowDown');
  assert.equal(await viewport.evaluate(n => n === document.activeElement), true);
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'default');
  await state.hover(); await page.mouse.move(0, 0); await page.keyboard.press('ArrowUp');
  assert.equal(await viewport.evaluate(n => n === document.activeElement), true);
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'default');
  await state.evaluate(n => { n.disabled = true; }); await state.hover();
  const size = await viewport.inputValue(); await page.keyboard.press('ArrowDown');
  assert.notEqual(await viewport.inputValue(), size);
  assert.equal(await viewport.evaluate(n => n === document.activeElement), true);
});

test('a hovered picker never takes arrows from text editing or an open dialog', async t => {
  const page = await open(t), state = page.locator('#state-picker');
  await page.locator('#tool-note').click(); await state.hover();
  await page.locator('#brush').focus(); await page.keyboard.press('Enter');
  const input = page.locator('#note-text'); await input.fill('abc');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.type('X');
  assert.equal(await input.inputValue(), 'abXc');
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'default');
  const cancel = page.locator('#note-cancel'); await cancel.focus(); await page.keyboard.press('ArrowDown');
  assert.equal(await cancel.evaluate(n => n === document.activeElement), true);
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'default');
});

test('Tab and arrows preview screens, states and viewports without Enter or losing focus', async t => {
  const page = await open(t);
  await page.evaluate(() => {
    const doc = Frame.agent.getDocument('instrument'), {states, ...base} = doc;
    Frame.agent.updateDocument({...base, revisionId: 'keyboard-views', views: [
      {id: 'main', label: 'Main', contexts: [
        {id: 'default', label: 'Browse', overrides: states.default},
        {id: 'loading', label: 'Loading', overrides: states.loading}
      ]},
      {id: 'other', label: 'Other', contexts: [{id: 'error', label: 'Error', overrides: states.error}]}
    ]});
  });
  const viewport = page.locator('#viewport-picker'), screen = page.locator('#view-picker'), state = page.locator('#context-picker');
  await viewport.focus(); await page.keyboard.press('Tab');
  assert.equal(await screen.evaluate(n => n === document.activeElement), true);
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'error');
  assert.equal(await screen.evaluate(n => n === document.activeElement), true);
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('Tab');
  assert.equal(await state.evaluate(n => n === document.activeElement), true);
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'loading');
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'default');
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('End');
  assert.deepEqual(await page.evaluate(() => Frame.currentViewport('instrument')), {width:360, height:740});
  assert.equal(await viewport.evaluate(n => n === document.activeElement), true);
});

test('preview navigation skips disabled options, clamps boundaries and preserves native popup keys', async t => {
  const page = await open(t), picker = page.locator('#state-picker');
  await picker.evaluate(n => {
    n.options[1].disabled = true;
    window.previewChanges = 0;
    n.addEventListener('change', () => window.previewChanges++);
  });
  await picker.focus(); await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => Frame.currentState('instrument')), 'empty');
  await page.keyboard.press('End');
  const changes = await page.evaluate(() => window.previewChanges);
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => window.previewChanges), changes);
  const handled = await picker.evaluate(n => {
    const events = ['Enter', ' ', 'Escape'].map(key => new KeyboardEvent('keydown', {key, bubbles:true, cancelable:true}));
    events.push(new KeyboardEvent('keydown', {key:'ArrowDown', altKey:true, bubbles:true, cancelable:true}));
    events.forEach(event => n.dispatchEvent(event));
    return events.map(event => event.defaultPrevented);
  });
  assert.deepEqual(handled, [false, false, false, false]);
});

test('ordinary text editing keeps arrow navigation', async t => {
  const page = await open(t);
  await page.locator('#tool-note').click(); await page.locator('#brush').focus(); await page.keyboard.press('Enter');
  const input = page.locator('#note-text'); await input.fill('abc');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.type('X');
  assert.equal(await input.inputValue(), 'abXc');
});

test('history arrows preview revisions immediately without restoring the live design', async t => {
  const page = await open(t);
  const before = await page.evaluate(() => {
    Frame.agent.applyEdits('instrument', [{op:'update', id:'title', patch:{text:'New title'}}]);
    return {doc:Frame.agent.getDocument('instrument'), marks:Frame.agent.getFeedback(), view:Frame.view.get()};
  });
  assert.equal(await page.locator('#revision-picker').isVisible(), false);
  await page.locator('#revision-history').click();
  const after = page.locator('#review-after'); await after.focus(); await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => document.getElementById('revision-review').dataset.rendering === 'false');
  assert.equal(await after.inputValue(), 'instrument-r1');
  assert.equal(await after.evaluate(n => n === document.activeElement), true);
  assert.equal(await page.locator('#restore-history-revision').isEnabled(), true);
  assert.deepEqual(await page.evaluate(() => ({doc:Frame.agent.getDocument('instrument'), marks:Frame.agent.getFeedback(), view:Frame.view.get()})), before);
});
