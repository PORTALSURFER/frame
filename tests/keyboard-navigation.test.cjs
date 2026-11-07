const {test} = require('node:test');
const assert = require('node:assert/strict');
const {reviewHarness} = require('./review-harness.cjs');
const open = reviewHarness();

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
