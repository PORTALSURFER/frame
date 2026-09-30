const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
let server, browser, baseURL;

before(async () => {
  server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'};
      response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
      response.end(await fs.readFile(filename));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.FRAME_BROWSER_PATH || undefined,
    headless: true
  });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function openPage(t, options = {}) {
  const {setup, selectDesign = 'starter', ...contextOptions} = options;
  const context = await browser.newContext({viewport: {width: 1280, height: 900}, ...contextOptions});
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'no uncaught browser errors'));
  if (setup) await setup(page);
  await page.goto(baseURL);
  if (selectDesign) await page.locator('#design-picker').selectOption(selectDesign);
  return page;
}

async function savedLines(page) {
  return page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('frame-feedback-v3:starter') ?? localStorage.getItem('frame-feedback-v2:starter') ?? localStorage.getItem('frame-feedback-v1:starter') ?? '[]');
    return Array.isArray(data) ? data : data.lines.map(line => line.points || line);
  });
}

async function beginMouse(page) {
  const bounds = await page.locator('#board').boundingBox();
  await page.mouse.move(bounds.x + 100, bounds.y + 100);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 150, bounds.y + 150, {steps: 3});
}

test('secondary mouse, touch, and pen events cannot replace, extend, or finish a stroke', async t => {
  const page = await openPage(t);
  await beginMouse(page);
  const original = await page.locator('#brush path').getAttribute('d');
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
      await page.locator('#brush').dispatchEvent(type, {
        pointerId: 77, pointerType, button: 0, clientX: 800, clientY: 500
      });
    }
  }
  assert.equal(await page.locator('#brush path').count(), 1);
  assert.equal(await page.locator('#brush path').getAttribute('d'), original);
  assert.deepEqual(await savedLines(page), []);
  await page.mouse.up();
  assert.equal((await savedLines(page)).length, 1);
});

for (const ending of ['pointercancel', 'lostpointercapture']) {
  test(`${ending} saves the owning stroke once and allows another stroke`, async t => {
    const page = await openPage(t);
    await page.evaluate(() => {
      document.getElementById('brush').addEventListener('pointerdown', event => {
        window.testPointerId = event.pointerId;
      });
    });
    await beginMouse(page);
    await page.evaluate(ending => {
      const brush = document.getElementById('brush');
      if (ending === 'lostpointercapture') brush.releasePointerCapture(window.testPointerId);
      else brush.dispatchEvent(new PointerEvent(ending, {pointerId: window.testPointerId}));
    }, ending);
    await page.mouse.up();
    assert.equal((await savedLines(page)).length, 1);
    await beginMouse(page);
    await page.mouse.up();
    assert.equal((await savedLines(page)).length, 2);
    await page.reload();
    assert.equal(await page.locator('#brush path').count(), 2);
  });
}

test('touch and pen input can draw and save strokes', async t => {
  const page = await openPage(t, {hasTouch: true});
  const bounds = await page.locator('#board').boundingBox();
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{x: bounds.x + 100, y: bounds.y + 100}]
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove', touchPoints: [{x: bounds.x + 150, y: bounds.y + 150}]
  });
  await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  assert.equal((await savedLines(page)).length, 1);
  for (const [type, offset, buttons] of [['mousePressed', 200, 1], ['mouseMoved', 250, 1], ['mouseReleased', 250, 0]]) {
    await session.send('Input.dispatchMouseEvent', {
      type, x: bounds.x + offset, y: bounds.y + offset, button: 'left', buttons,
      clickCount: type === 'mouseMoved' ? 0 : 1, pointerType: 'pen'
    });
  }
  const lines = await savedLines(page);
  assert.equal(lines.length, 2);
  assert.ok(lines.every(line => line.length >= 2));
});

for (const previousStroke of [false, true]) {
  test(`keyboard undo during drawing removes the active stroke (${previousStroke ? 'with' : 'without'} previous feedback)`, async t => {
    const page = await openPage(t);
    if (previousStroke) {
      await beginMouse(page);
      await page.mouse.up();
    }
    const previous = await savedLines(page);
    await beginMouse(page);
    await page.keyboard.press('Control+z');
    await page.mouse.move(800, 500);
    await page.mouse.up();
    assert.deepEqual(await savedLines(page), previous);
    assert.equal(await page.locator('#brush path').count(), previous.length);
    await beginMouse(page);
    await page.mouse.up();
    assert.equal((await savedLines(page)).length, previous.length + 1);
    await page.reload();
    assert.equal(await page.locator('#brush path').count(), previous.length + 1);
  });
}

for (const action of ['undo', 'clear']) {
  test(`${action} control safely ends an active stroke`, async t => {
    const page = await openPage(t);
    await beginMouse(page);
    await page.mouse.up();
    const previous = await savedLines(page);
    await beginMouse(page);
    await page.locator(`#${action}`).dispatchEvent('click');
    await page.mouse.move(800, 500);
    await page.mouse.up();
    const expected = action === 'undo' ? previous : [];
    assert.deepEqual(await savedLines(page), expected);
    assert.equal(await page.locator('#brush path').count(), expected.length);
    await beginMouse(page);
    await page.mouse.up();
    assert.equal((await savedLines(page)).length, expected.length + 1);
  });
}

for (const mode of ['empty', 'unavailable', 'populated']) {
  test(`records movement and the release endpoint with ${mode} coalesced events`, async t => {
    const page = await openPage(t);
    await page.evaluate(mode => {
      Object.defineProperty(PointerEvent.prototype, 'getCoalescedEvents', {
        configurable: true,
        value: mode === 'unavailable' ? undefined : function () {
          return mode === 'empty' ? [] : [
            {clientX: this.clientX - 20, clientY: this.clientY},
            {clientX: this.clientX, clientY: this.clientY}
          ];
        }
      });
      document.getElementById('brush').addEventListener('pointerdown', event => {
        window.testPointerId = event.pointerId;
      });
    }, mode);
    const bounds = await page.locator('#board').boundingBox();
    await page.mouse.move(bounds.x + 100, bounds.y + 100);
    await page.mouse.down();
    await page.evaluate(({x, y}) => {
      const brush = document.getElementById('brush');
      for (const [type, offsetX, offsetY] of [['pointermove', 250, 200], ['pointerup', 280, 220]]) {
        brush.dispatchEvent(new PointerEvent(type, {
          pointerId: window.testPointerId, clientX: x + offsetX, clientY: y + offsetY
        }));
      }
    }, bounds);
    await page.mouse.up();
    const lines = await savedLines(page);
    assert.equal(lines.length, 1);
    assert.deepEqual(lines[0][0], [100, 100]);
    assert.ok(lines[0].some(([x, y]) => x === 250 && y === 200));
    assert.deepEqual(lines[0].at(-1), [280, 220]);
    if (mode === 'populated') {
      assert.ok(lines[0].some(([x, y]) => x === 230 && y === 200), 'preserves intermediate samples');
    }
  });
}

async function seedFeedback(page, lines, key = 'frame-feedback-v1:starter') {
  await page.evaluate(({key, lines}) => localStorage.setItem(key, JSON.stringify(lines)), {key, lines});
  await page.reload();
}

function projectFeedback(data) {
  if (!data || data.version !== 3) return data;
  return {...data, lines: data.lines.map(line => line.points), notes: data.notes.map(({id, text, anchor}) => ({id, text, anchor}))};
}
async function exportFeedback(page, raw = false) {
  const downloaded = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await downloaded;
  const data = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  return raw ? data : projectFeedback(data);
}

test('the 1,000-line boundary blocks new strokes without losing feedback and undo/clear restore drawing', async t => {
  const page = await openPage(t);
  const existing = Array.from({length: 999}, () => [[10, 10], [20, 20]]);
  await seedFeedback(page, existing);
  assert.equal(await page.locator('#feedback-limit-notice').textContent(), '');
  await beginMouse(page);
  await page.mouse.up();
  const atLimit = await savedLines(page);
  assert.equal(atLimit.length, 1000);
  assert.deepEqual(atLimit.slice(0, 999), existing);
  await beginMouse(page);
  await page.mouse.up();
  assert.deepEqual(await savedLines(page), atLimit);
  assert.equal(await page.locator('#brush path').count(), 1000);
  assert.match(await page.locator('#feedback-limit-notice').textContent(), /1,000-line limit reached/);
  assert.deepEqual((await exportFeedback(page)).lines, atLimit);
  await page.reload();
  assert.equal(await page.locator('#brush path').count(), 1000);
  assert.match(await page.locator('#feedback-limit-notice').textContent(), /1,000-line limit reached/);
  await page.locator('#design-picker').selectOption('sift');
  assert.equal(await page.locator('#feedback-limit-notice').textContent(), '');
  await page.locator('#design-picker').selectOption('starter');
  assert.equal(await page.locator('#undo').isDisabled(), true);
  await page.locator('#tool-select').click();
  await page.locator('#brush path').last().focus();
  await page.locator('#delete-selected').click();
  await page.locator('#tool-pen').click();
  assert.equal(await page.locator('#feedback-limit-notice').textContent(), '');
  await beginMouse(page);
  await page.mouse.up();
  assert.equal((await savedLines(page)).length, 1000);
  await page.locator('#clear').click();
  assert.equal(await page.locator('#feedback-limit-notice').textContent(), '');
  await beginMouse(page);
  await page.mouse.up();
  assert.equal((await savedLines(page)).length, 1);
});

test('a stroke ends at 5,000 points even within a larger event batch and survives export/reload', async t => {
  const page = await openPage(t);
  await page.evaluate(() => {
    document.getElementById('brush').addEventListener('pointerdown', event => {
      window.testPointerId = event.pointerId;
    });
  });
  const bounds = await page.locator('#board').boundingBox();
  await page.mouse.move(bounds.x + 100, bounds.y + 100);
  await page.mouse.down();
  async function sendSamples(start, length) {
    await page.evaluate(({x, y, start, length}) => {
      const event = new PointerEvent('pointermove', {pointerId: window.testPointerId});
      event.getCoalescedEvents = () => Array.from({length}, (_, index) => ({
        clientX: x + 200 + (start + index) % 2, clientY: y + 150
      }));
      document.getElementById('brush').dispatchEvent(event);
    }, {...bounds, start, length});
  }
  await sendSamples(0, 4998);
  assert.deepEqual(await savedLines(page), [], 'a 4,999-point stroke is still active');
  assert.equal(await page.locator('#feedback-limit-notice').textContent(), '');
  await sendSamples(4998, 1002);
  const atLimit = await savedLines(page);
  assert.equal(atLimit.length, 1);
  assert.equal(atLimit[0].length, 5000);
  assert.deepEqual(atLimit[0][0], [100, 100]);
  assert.deepEqual(atLimit[0].at(-1), [200, 150]);
  assert.match(await page.locator('#feedback-limit-notice').textContent(), /line ended at the 5,000-point limit/);
  await page.mouse.move(800, 500);
  await page.mouse.up();
  assert.deepEqual(await savedLines(page), atLimit);
  assert.deepEqual((await exportFeedback(page)).lines, atLimit);
  await page.reload();
  assert.deepEqual(await savedLines(page), atLimit);
  assert.equal(await page.locator('#brush path').count(), 1);
  await beginMouse(page);
  await page.mouse.up();
  const continued = await savedLines(page);
  assert.equal(continued.length, 2);
  assert.deepEqual(continued[0], atLimit[0]);
  assert.equal(await page.locator('#feedback-limit-notice').textContent(), '');
});

test('older feedback above both limits is preserved through load, export, and later edits', async t => {
  const page = await openPage(t);
  const legacy = Array.from({length: 1001}, () => [[10, 10], [20, 20]]);
  legacy[0] = Array.from({length: 5001}, (_, index) => [100 + index % 2, 150]);
  await seedFeedback(page, legacy);
  assert.equal(await page.locator('#brush path').count(), 1001);
  assert.match(await page.locator('#feedback-limit-notice').textContent(), /Older feedback exceeds/);
  assert.deepEqual((await exportFeedback(page)).lines, legacy);
  await beginMouse(page);
  await page.mouse.up();
  assert.deepEqual(await savedLines(page), legacy);
  await page.locator('#tool-select').click();
  await page.locator('#brush path').last().focus();
  await page.locator('#delete-selected').click();
  const afterUndo = legacy.slice(0, -1);
  assert.deepEqual(await savedLines(page), afterUndo);
  await page.reload();
  assert.equal(await page.locator('#brush path').count(), 1000);
  assert.deepEqual((await exportFeedback(page)).lines, afterUndo);
});

test('the original Sift storage key also preserves strokes longer than 5,000 points', async t => {
  const page = await openPage(t);
  const legacy = [Array.from({length: 5001}, (_, index) => [100 + index % 2, 150])];
  await seedFeedback(page, legacy, 'sift-ui-feedback-v1');
  await page.locator('#design-picker').selectOption('sift');
  assert.match(await page.locator('#feedback-limit-notice').textContent(), /Older feedback exceeds/);
  assert.deepEqual((await exportFeedback(page)).lines, legacy);
  await page.reload();
  assert.deepEqual((await exportFeedback(page)).lines, legacy);
});

for (const failure of ['QuotaExceededError', 'SecurityError']) {
  test(`${failure} keeps feedback exportable across design switches and retry saves it`, async t => {
    const page = await openPage(t, {setup: page => page.addInitScript(failure => {
      const original = Storage.prototype.setItem;
      window.failFeedbackSave = true;
      Storage.prototype.setItem = function (key, value) {
        if (window.failFeedbackSave && key.startsWith('frame-feedback-')) {
          throw new DOMException('Simulated storage failure', failure);
        }
        return original.call(this, key, value);
      };
    }, failure)});
    await beginMouse(page);
    await page.mouse.up();
    assert.match(await page.locator('#feedback-save-notice').textContent(), /Feedback is unsaved/);
    assert.match(await page.locator('#feedback-save-notice').textContent(), failure === 'QuotaExceededError' ? /storage is full/ : /storage is unavailable/);
    const exported = await exportFeedback(page);
    assert.equal(exported.lines.length, 1);
    assert.deepEqual(await savedLines(page), []);
    await page.locator('#design-picker').selectOption('sift');
    assert.equal(await page.locator('#feedback-save-notice').textContent(), '');
    await beginMouse(page);
    await page.mouse.up();
    const sift = await exportFeedback(page);
    await page.locator('#design-picker').selectOption('starter');
    assert.deepEqual((await exportFeedback(page)).lines, exported.lines);
    assert.match(await page.locator('#feedback-save-notice').textContent(), /Feedback is unsaved/);
    await page.locator('#retry-save').click();
    assert.match(await page.locator('#feedback-save-notice').textContent(), /Feedback is unsaved/);
    await page.evaluate(() => { window.failFeedbackSave = false; });
    await page.locator('#retry-save').click();
    assert.equal(await page.locator('#feedback-save-notice').textContent(), '');
    assert.equal(await page.locator('#retry-save').isVisible(), false);
    assert.deepEqual(await savedLines(page), exported.lines);
    await page.locator('#design-picker').selectOption('sift');
    assert.deepEqual((await exportFeedback(page)).lines, sift.lines);
    await page.locator('#retry-save').click();
    await page.reload();
    assert.deepEqual((await exportFeedback(page)).lines, sift.lines);
  });
}

test('a failed clear remains exportable and retry persists the empty feedback', async t => {
  const page = await openPage(t);
  await beginMouse(page);
  await page.mouse.up();
  const saved = await savedLines(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  });
  await page.locator('#clear').click();
  assert.deepEqual(await savedLines(page), saved);
  assert.deepEqual((await exportFeedback(page)).lines, []);
  assert.match(await page.locator('#feedback-save-notice').textContent(), /Feedback is unsaved/);
  await page.locator('#design-picker').selectOption('sift');
  await page.locator('#design-picker').selectOption('starter');
  assert.equal(await page.locator('#brush path').count(), 0);
  await page.evaluate(() => window.restoreStorage());
  await page.locator('#retry-save').click();
  assert.deepEqual(await savedLines(page), []);
  assert.equal(await page.locator('#feedback-save-notice').textContent(), '');
  await page.reload();
  assert.equal(await page.locator('#brush path').count(), 0);
});

test('unavailable localStorage at startup reports a load failure while drawing/export remain usable', async t => {
  const page = await openPage(t, {setup: page => page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('Blocked', 'SecurityError'); }});
  })});
  assert.match(await page.locator('#feedback-save-notice').textContent(), /could not be loaded/);
  await beginMouse(page);
  await page.mouse.up();
  assert.match(await page.locator('#feedback-save-notice').textContent(), /Feedback is unsaved/);
  const exported = await exportFeedback(page);
  await page.locator('#design-picker').selectOption('sift');
  await page.locator('#design-picker').selectOption('starter');
  assert.deepEqual((await exportFeedback(page)).lines, exported.lines);
});

test('invalid and duplicate registrations report errors while retaining working designs', async t => {
  const page = await openPage(t);
  const result = await page.evaluate(() => {
    const original = Frame.designs.get('starter');
    return {
      invalid: Frame.register({id: 'bad', name: 'Bad design', width: 0, height: 200, paint() {}}),
      duplicate: Frame.register({...original, name: 'Replacement'}),
      retained: Frame.designs.get('starter') === original,
      errors: Frame.errors
    };
  });
  assert.equal(result.invalid, false);
  assert.equal(result.duplicate, false);
  assert.equal(result.retained, true);
  assert.equal(result.errors.length, 2);
  assert.equal(await page.locator('#registration-notice').isVisible(), true);
  await page.locator('#registration-summary').click();
  assert.match(await page.locator('#registration-errors').textContent(), /bad:.*positive integer size/);
  assert.match(await page.locator('#registration-errors').textContent(), /starter: Duplicate design id/);
  assert.equal(await page.locator('#design-status').isVisible(), false);
  assert.equal(await page.locator('#design-picker option').count(), 2);
  await beginMouse(page);
  await page.mouse.up();
  assert.equal((await savedLines(page)).length, 1);
});

for (const mode of ['empty', 'invalid']) {
  test(`${mode} startup shows an empty state and can recover when a valid design is registered`, async t => {
    const page = await openPage(t, {selectDesign: false, setup: async page => {
      for (const file of ['starter', 'sift']) {
        await page.route(`**/examples/${file}.js`, route => route.fulfill({
          contentType: 'text/javascript',
          body: mode === 'empty' ? '' : `Frame.register({id: 'bad-${file}', name: 'Invalid', width: 0, height: 100, paint() {}});`
        }));
      }
    }});
    assert.equal(await page.locator('#design-status').isVisible(), true);
    assert.equal(await page.locator('#design-status-title').textContent(), 'No designs available');
    assert.equal(await page.locator('#design-picker').isDisabled(), true);
    assert.equal(await page.locator('#download').isDisabled(), true);
    assert.equal(await page.locator('#brush').isVisible(), false);
    assert.equal(await page.locator('#registration-notice').isVisible(), mode === 'invalid');
    assert.equal(await page.evaluate(() => Frame.register({
      id: 'recovered', name: 'Recovered design', width: 400, height: 300,
      paint(ctx) { ctx.fillStyle = '#77b6a7'; ctx.fillRect(0, 0, 400, 300); }
    })), true);
    assert.equal(await page.locator('#design-picker').inputValue(), 'recovered');
    assert.equal(await page.locator('#design-picker').isDisabled(), false);
    assert.equal(await page.locator('#design-status').isVisible(), false);
    assert.equal(await page.locator('#brush').isVisible(), true);
    await beginMouse(page);
    await page.mouse.up();
    const exported = await exportFeedback(page);
    assert.equal(exported.design, 'recovered');
    assert.equal(exported.lines.length, 1);
  });
}

test('paint failures preserve feedback and allow switching, failed retry, and successful retry', async t => {
  const previous = [[[10, 10], [20, 20]]];
  const page = await openPage(t, {setup: async page => {
    await page.addInitScript(previous => {
      localStorage.setItem('frame-feedback-v1:starter', JSON.stringify(previous));
    }, previous);
    await page.route('**/examples/starter.js', route => route.fulfill({
      contentType: 'text/javascript',
      body: "Frame.register({id: 'starter', name: 'Broken design', width: 960, height: 600, paint(ctx) {ctx.fillRect(0, 0, 200, 200); throw new Error('Deliberate paint failure');}});"
    }));
  }});
  assert.equal(await page.locator('#design-status-title').textContent(), 'Design could not be rendered');
  assert.equal(await page.locator('#brush').isVisible(), false);
  assert.equal(await page.locator('#board').isVisible(), false);
  assert.deepEqual((await exportFeedback(page)).lines, previous);
  await page.locator('#design-status details summary').click();
  assert.equal(await page.locator('#design-error-details').textContent(), 'Deliberate paint failure');
  await page.locator('#retry-render').click();
  assert.equal(await page.locator('#design-status').isVisible(), true);
  await page.locator('#design-picker').selectOption('sift');
  assert.equal(await page.locator('#design-status').isVisible(), false);
  await beginMouse(page);
  await page.mouse.up();
  assert.equal((await exportFeedback(page)).lines.length, 1);
  await page.locator('#design-picker').selectOption('starter');
  assert.deepEqual((await exportFeedback(page)).lines, previous);
  await page.evaluate(() => {
    Frame.designs.get('starter').paint = ctx => { ctx.fillStyle = '#77b6a7'; ctx.fillRect(0, 0, 960, 600); };
  });
  await page.locator('#retry-render').click();
  assert.equal(await page.locator('#design-status').isVisible(), false);
  assert.equal(await page.locator('#brush').isVisible(), true);
  assert.equal(await page.locator('#brush path').count(), 1);
  await beginMouse(page);
  await page.mouse.up();
  assert.equal((await savedLines(page)).length, 2);
});

test('a missing Canvas context produces a recoverable render error', async t => {
  const page = await openPage(t, {setup: page => page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null;
    window.restoreCanvasContext = () => { HTMLCanvasElement.prototype.getContext = original; };
  })});
  assert.equal(await page.locator('#design-error-details').textContent(), 'Canvas drawing is unavailable in this browser');
  assert.equal(await page.locator('#brush').isVisible(), false);
  await page.evaluate(() => window.restoreCanvasContext());
  await page.locator('#retry-render').click();
  assert.equal(await page.locator('#design-status').isVisible(), false);
  await beginMouse(page);
  await page.mouse.up();
  assert.equal((await savedLines(page)).length, 1);
});

async function assertMarksAligned(page, feedback) {
  // Wait for layout and ResizeObserver redraws before measuring actual SVG coordinates.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const measurements = await page.evaluate(feedback => {
    const board = document.getElementById('board').getBoundingClientRect();
    return [...document.querySelectorAll('#brush path')].map((path, index) => {
      const line = feedback.lines[index];
      return [0, 1].map(endpoint => {
        const actual = path.getPointAtLength(endpoint ? path.getTotalLength() : 0).matrixTransform(path.getScreenCTM());
        const expected = endpoint ? line.at(-1) : line[0];
        return Math.hypot(
          actual.x - (board.x + expected[0] * board.width / feedback.width),
          actual.y - (board.y + expected[1] * board.height / feedback.height)
        );
      });
    });
  }, feedback);
  assert.equal(measurements.length, feedback.lines.length);
  for (const endpoints of measurements) {
    assert.ok(endpoints.every(error => error < 0.2), `marks align within 0.2 CSS pixels: ${endpoints}`);
  }
}

test('draw → resize → switch design → reload → export preserves feedback and visual alignment', async t => {
  const page = await openPage(t);
  await beginMouse(page);
  await page.mouse.up();
  const starter = await exportFeedback(page);
  assert.equal(starter.design, 'starter');
  assert.equal(starter.width, 960);
  assert.equal(starter.height, 600);
  assert.deepEqual(starter.lines[0][0], [100, 100]);
  assert.deepEqual(starter.lines[0].at(-1), [150, 150]);
  await assertMarksAligned(page, starter);
  await page.setViewportSize({width: 600, height: 700});
  await assertMarksAligned(page, starter);
  assert.deepEqual(await savedLines(page), starter.lines);
  await page.locator('#design-picker').selectOption('sift');
  assert.equal(await page.locator('#brush path').count(), 0);
  await beginMouse(page);
  await page.mouse.up();
  const sift = await exportFeedback(page);
  assert.equal(sift.design, 'sift');
  await assertMarksAligned(page, sift);
  await page.locator('#design-picker').selectOption('starter');
  assert.deepEqual(await exportFeedback(page), starter);
  await assertMarksAligned(page, starter);
  await page.reload();
  assert.equal(await page.locator('#design-picker').inputValue(), 'starter');
  assert.deepEqual(await exportFeedback(page), starter);
  await assertMarksAligned(page, starter);
  await page.setViewportSize({width: 1280, height: 900});
  await assertMarksAligned(page, starter);
  await page.locator('#design-picker').selectOption('sift');
  assert.deepEqual(await exportFeedback(page), sift);
  await assertMarksAligned(page, sift);
});

test('outside-board Shift lines retain their endpoints after resizing and reload', async t => {
  const page = await openPage(t);
  const board = await page.locator('#board').boundingBox();
  await page.mouse.move(board.x - 12, board.y + 50);
  await page.mouse.down();
  await page.keyboard.down('Shift');
  await page.mouse.move(board.x + 250, board.y + 200, {steps: 8});
  await page.mouse.up();
  await page.keyboard.up('Shift');
  const feedback = await exportFeedback(page);
  assert.equal(feedback.lines[0].length, 2);
  assert.deepEqual(feedback.lines[0][0], [-12, 50]);
  assert.deepEqual(feedback.lines[0][1], [250, 200]);
  await page.setViewportSize({width: 600, height: 700});
  await assertMarksAligned(page, feedback);
  await page.reload();
  assert.deepEqual(await exportFeedback(page), feedback);
  await assertMarksAligned(page, feedback);
});

test('leaving prompts for unsaved feedback in another design and stops prompting after recovery', async t => {
  const page = await openPage(t);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('frame-feedback-')) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await beginMouse(page);
  await page.mouse.up();
  const feedback = await exportFeedback(page);
  await page.locator('#design-picker').selectOption('sift');
  const prevented = await page.evaluate(() => {
    const event = new Event('beforeunload', {cancelable: true});
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  assert.equal(prevented, true, 'unsaved feedback in another design also prevents leaving silently');
  const dialogEvent = page.waitForEvent('dialog');
  const navigation = page.goto(`${baseURL}/?leaving`).catch(error => error);
  const dialog = await dialogEvent;
  assert.equal(dialog.type(), 'beforeunload');
  await dialog.dismiss();
  const result = await navigation;
  assert.ok(result instanceof Error, 'declining the prompt cancels navigation');
  await page.locator('#design-picker').selectOption('starter');
  assert.deepEqual((await exportFeedback(page)).lines, feedback.lines);
  await page.evaluate(() => window.restoreStorage());
  await page.locator('#retry-save').click();
  assert.equal(await page.evaluate(() => {
    const event = new Event('beforeunload', {cancelable: true});
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }), false);
  await page.reload();
  assert.deepEqual((await exportFeedback(page)).lines, feedback.lines);
});

test('pen/select modes show active state, select near a stroke without drawing, and safely end active strokes', async t => {
  const page = await openPage(t);
  await beginMouse(page);
  await page.locator('#tool-select').dispatchEvent('click');
  await page.mouse.up();
  const saved = await savedLines(page);
  assert.equal(saved.length, 1);
  assert.equal(await page.locator('#tool-select').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#tool-pen').getAttribute('aria-pressed'), 'false');
  const bounds = await page.locator('#board').boundingBox();
  await page.mouse.click(bounds.x + 125, bounds.y + 130);
  assert.equal(await page.locator('#brush path.selected').count(), 1);
  assert.equal(await page.locator('#selection-status').textContent(), 'Line 1 selected.');
  assert.deepEqual(await savedLines(page), saved);
  await page.setViewportSize({width: 600, height: 700});
  assert.equal(await page.locator('#brush path.selected').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#brush path.selected').count(), 0);
  await page.locator('#brush path').focus();
  assert.equal(await page.locator('#brush path.selected').count(), 1);
  await page.locator('#tool-pen').click();
  assert.equal(await page.locator('#brush path.selected').count(), 0);
  await beginMouse(page);
  await page.mouse.up();
  assert.equal((await savedLines(page)).length, 2);
});

test('feedback shortcuts do not capture text editing, editable text, or select controls', async t => {
  const page = await openPage(t);
  await beginMouse(page);
  await page.mouse.up();
  const saved = await savedLines(page);
  await page.evaluate(() => {
    for (const tag of ['input', 'textarea', 'div']) {
      const element = document.createElement(tag);
      element.id = `test-${tag}`;
      if (tag === 'div') element.contentEditable = 'true';
      document.body.append(element);
    }
  });
  for (const target of ['#test-input', '#test-textarea', '#test-div', '#design-picker']) {
    const result = await page.locator(target).evaluate(element => {
      element.focus();
      return ['p', 'n', 'v', 'z'].map(key => {
        const event = new KeyboardEvent('keydown', {key, ctrlKey: key === 'z', bubbles: true, cancelable: true});
        element.dispatchEvent(event);
        return event.defaultPrevented;
      });
    });
    assert.deepEqual(result, [false, false, false, false]);
    assert.equal(await page.locator('#tool-pen').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await savedLines(page), saved);
  }
  await page.locator('#tool-pen').focus();
  await page.keyboard.press('v');
  assert.equal(await page.locator('#tool-select').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('p');
  assert.equal(await page.locator('#tool-pen').getAttribute('aria-pressed'), 'true');
});

async function addNote(page, text, anchor = [300, 200]) {
  await page.locator('#tool-note').click();
  const bounds = await page.locator('#board').boundingBox();
  const size = await page.evaluate(() => Frame.designs.get(document.getElementById('design-picker').value));
  await page.mouse.click(bounds.x + anchor[0] * bounds.width / size.width, bounds.y + anchor[1] * bounds.height / size.height);
  await page.locator('#note-text').fill(text);
  await page.locator('#note-save').click();
}

async function assertNoteAligned(page, note, width = 960, height = 600) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const distance = await page.locator(`[data-note-id="${note.id}"]`).evaluate((pin, {note, width, height}) => {
    const board = document.getElementById('board').getBoundingClientRect();
    const bounds = pin.getBoundingClientRect();
    return Math.hypot(bounds.x + bounds.width / 2 - (board.x + note.anchor[0] * board.width / width),
      bounds.y + bounds.height / 2 - (board.y + note.anchor[1] * board.height / height));
  }, {note, width, height});
  assert.ok(distance < 0.2, `note anchor is aligned within 0.2 CSS pixels: ${distance}`);
}

test('placed notes retain text and anchor across edit, resize, design switches, reload, and export', async t => {
  const page = await openPage(t);
  await beginMouse(page);
  await page.mouse.up();
  const oldLines = await savedLines(page);
  await addNote(page, 'Give these controls more space.\nKeep the label visible.');
  assert.equal(await page.locator('#tool-note').getAttribute('aria-pressed'), 'true');
  let feedback = await exportFeedback(page);
  assert.equal(feedback.version, 3);
  assert.deepEqual(feedback.lines, oldLines);
  assert.equal(feedback.notes.length, 1);
  assert.deepEqual(feedback.notes[0].anchor, [300, 200]);
  assert.equal(feedback.notes[0].text, 'Give these controls more space.\nKeep the label visible.');
  await assertNoteAligned(page, feedback.notes[0]);
  await page.locator('.note-pin').click();
  await page.locator('#note-text').fill('More space, please.');
  await page.keyboard.press('Control+Enter');
  const edited = await exportFeedback(page);
  assert.equal(edited.notes[0].id, feedback.notes[0].id);
  assert.equal(edited.notes[0].text, 'More space, please.');
  await page.setViewportSize({width: 600, height: 700});
  await assertNoteAligned(page, edited.notes[0]);
  await page.locator('#design-picker').selectOption('sift');
  assert.equal(await page.locator('.note-pin').count(), 0);
  await page.locator('#design-picker').selectOption('starter');
  assert.deepEqual(await exportFeedback(page), edited);
  await page.reload();
  assert.deepEqual(await exportFeedback(page), edited);
  await assertNoteAligned(page, edited.notes[0]);
  await page.setViewportSize({width: 320, height: 760});
  await assertNoteAligned(page, edited.notes[0]);
  const preview = await page.locator('.note-preview').boundingBox();
  assert.ok(preview.x >= 0 && preview.x + preview.width <= 320, 'note preview fits a small viewport');
});

test('notes move by drag and keyboard and cancelled drags restore the saved position', async t => {
  const page = await openPage(t);
  await addNote(page, 'Move this control.');
  await page.locator('#tool-select').click();
  const pin = page.locator('.note-pin');
  let bounds = await pin.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2 + 30, {steps: 5});
  await page.mouse.up();
  assert.equal(await page.locator('#note-dialog').isVisible(), false, 'dragging does not open the editor');
  let note = (await exportFeedback(page)).notes[0];
  assert.deepEqual(note.anchor, [360, 230]);
  await pin.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  note = (await exportFeedback(page)).notes[0];
  assert.deepEqual(note.anchor, [361, 240]);
  await page.evaluate(() => {
    document.querySelector('.note-pin').addEventListener('pointerdown', event => { window.notePointer = event.pointerId; });
  });
  bounds = await pin.boundingBox();
  await page.mouse.move(bounds.x + 14, bounds.y + 14);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 54, bounds.y + 54);
  await pin.evaluate(pin => pin.dispatchEvent(new PointerEvent('pointercancel', {pointerId: window.notePointer})));
  await page.mouse.up();
  assert.deepEqual((await exportFeedback(page)).notes[0].anchor, [361, 240]);
  await page.setViewportSize({width: 600, height: 700});
  await assertNoteAligned(page, note);
  await page.reload();
  assert.deepEqual((await exportFeedback(page)).notes[0].anchor, [361, 240]);
});

test('cancelled and blank note edits do not mutate feedback; text is rendered literally', async t => {
  const page = await openPage(t);
  await addNote(page, '<img src=x onerror=alert(1)>');
  const original = await exportFeedback(page);
  assert.equal(await page.locator('#notes-layer img').count(), 0);
  assert.equal(await page.locator('.note-preview').textContent(), '<img src=x onerror=alert(1)>');
  await page.locator('.note-pin').click();
  await page.locator('#note-text').fill('   ');
  await page.locator('#note-save').click();
  assert.match(await page.locator('#note-error').textContent(), /Write a note/);
  await page.locator('#note-text').fill('Unsaved draft');
  assert.equal(await page.evaluate(() => {
    const event = new Event('beforeunload', {cancelable: true});
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }), true);
  await page.keyboard.press('Escape');
  assert.deepEqual(await exportFeedback(page), original);
  await page.locator('.note-pin').click();
  await page.locator('#note-delete').click();
  assert.equal(await page.locator('.note-pin').count(), 0);
  assert.equal(await page.locator('#download').isDisabled(), true);
  await page.reload();
  assert.equal(await page.locator('.note-pin').count(), 0);
});

test('stroke-only storage migrates on edit without overwriting its legacy backup', async t => {
  const page = await openPage(t);
  const legacy = [[[10, 10], [20, 20]]];
  await seedFeedback(page, legacy);
  await addNote(page, 'Keep the original line.');
  const stored = await page.evaluate(() => ({
    legacy: JSON.parse(localStorage.getItem('frame-feedback-v1:starter')),
    current: JSON.parse(localStorage.getItem('frame-feedback-v3:starter'))
  }));
  assert.deepEqual(stored.legacy, legacy);
  assert.equal(stored.current.version, 3);
  assert.deepEqual(stored.current.lines.map(line => line.points), legacy);
  assert.equal(stored.current.notes.length, 1);
  await page.locator('#clear').click();
  await page.reload();
  assert.equal(await page.locator('#brush path').count(), 0);
  assert.equal(await page.locator('.note-pin').count(), 0, 'empty v2 feedback takes precedence over legacy marks');
});

test('notes remain exportable after a failed save and failed clear, then retry saves the whole document', async t => {
  const page = await openPage(t);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('frame-feedback-')) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await addNote(page, 'Preserve this feedback.');
  const pending = await exportFeedback(page);
  assert.equal(pending.notes.length, 1);
  assert.match(await page.locator('#feedback-save-notice').textContent(), /Feedback is unsaved/);
  await page.locator('#design-picker').selectOption('sift');
  await page.locator('#design-picker').selectOption('starter');
  assert.deepEqual(await exportFeedback(page), pending);
  await page.evaluate(() => window.restoreStorage());
  await page.locator('#retry-save').click();
  await page.reload();
  assert.deepEqual(await exportFeedback(page), pending);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  });
  await page.locator('#clear').click();
  assert.deepEqual((await exportFeedback(page)).notes, []);
  await page.locator('#design-picker').selectOption('sift');
  await page.locator('#design-picker').selectOption('starter');
  assert.equal(await page.locator('.note-pin').count(), 0);
  await page.evaluate(() => window.restoreStorage());
  await page.locator('#retry-save').click();
  await page.reload();
  assert.equal(await page.locator('.note-pin').count(), 0);
});

test('note limits reject new additions and oversized edits without losing existing notes', async t => {
  const page = await openPage(t);
  const notes = Array.from({length: 1000}, (_, index) => ({id: `note-${index}`, text: `Note ${index}`, anchor: [10, 10]}));
  await seedFeedback(page, {version: 2, lines: [], notes}, 'frame-feedback-v2:starter');
  await page.locator('#tool-note').click();
  await page.locator('#brush').dispatchEvent('pointerdown', {button: 0, pointerId: 1, clientX: 500, clientY: 300});
  assert.equal(await page.locator('#note-dialog').isVisible(), false);
  assert.match(await page.locator('#feedback-limit-notice').textContent(), /1,000-note limit/);
  assert.deepEqual((await exportFeedback(page)).notes, notes);
  await page.locator('.note-pin').last().focus();
  await page.keyboard.press('Enter');
  await page.locator('#note-text').evaluate(textarea => { textarea.value = 'a'.repeat(4001); });
  await page.locator('#note-save').click();
  assert.match(await page.locator('#note-error').textContent(), /4,000 characters/);
  await page.locator('#note-cancel').click();
  assert.deepEqual((await exportFeedback(page)).notes, notes);
});

test('a note drag records the release position even without a preceding move event', async t => {
  const page = await openPage(t);
  await addNote(page, 'Keep the drag endpoint.');
  await page.locator('#tool-select').click();
  const note = (await exportFeedback(page)).notes[0];
  await assertNoteAligned(page, note);
  const board = await page.locator('#board').boundingBox();
  await page.evaluate(() => {
    document.querySelector('.note-pin').addEventListener('pointerdown', event => { window.notePointer = event.pointerId; });
  });
  await page.mouse.move(board.x + 300, board.y + 200);
  await page.mouse.down();
  await page.locator('.note-pin').evaluate((pin, board) => pin.dispatchEvent(new PointerEvent('pointerup', {
    pointerId: window.notePointer, clientX: board.x + 360, clientY: board.y + 240
  })), board);
  await page.mouse.up();
  assert.deepEqual((await exportFeedback(page)).notes[0].anchor, [360, 240]);
  assert.equal(await page.locator('#note-dialog').isVisible(), false);
});

test('deleting a selected middle stroke preserves other strokes and notes through export/reload', async t => {
  const page = await openPage(t);
  const lines = [[[100, 100], [200, 100]], [[100, 200], [200, 200]], [[100, 300], [200, 300]]];
  await seedFeedback(page, lines);
  await addNote(page, 'Keep this note.', [400, 300]);
  const original = await exportFeedback(page);
  await page.locator('#tool-select').click();
  const board = await page.locator('#board').boundingBox();
  await page.mouse.click(board.x + 150, board.y + 200);
  assert.equal(await page.locator('#brush path.selected').getAttribute('data-line-index'), '1');
  await page.locator('#delete-selected').click();
  const deleted = await exportFeedback(page);
  assert.deepEqual(deleted.lines, [lines[0], lines[2]]);
  assert.deepEqual(deleted.notes, original.notes);
  assert.equal(await page.locator('#brush path.selected').count(), 0);
  assert.equal(await page.locator('#delete-selected').isDisabled(), true);
  await page.reload();
  assert.deepEqual(await exportFeedback(page), deleted);
  await page.locator('#tool-select').click();
  await page.locator('#brush path').last().focus();
  await page.keyboard.press('Delete');
  assert.deepEqual((await exportFeedback(page)).lines, [lines[0]]);
});

test('Backspace deletes a selected note without deleting strokes or other notes', async t => {
  const page = await openPage(t);
  await beginMouse(page);
  await page.mouse.up();
  await addNote(page, 'Remove this note.', [300, 200]);
  await addNote(page, 'Keep this note.', [600, 400]);
  const original = await exportFeedback(page);
  await page.locator('#tool-select').click();
  await page.locator('.note-pin').first().click();
  await page.keyboard.press('Backspace');
  const deleted = await exportFeedback(page);
  assert.deepEqual(deleted.lines, original.lines);
  assert.deepEqual(deleted.notes, [original.notes[1]]);
  assert.equal(await page.locator('#delete-selected').isDisabled(), true);
  await page.locator('#design-picker').selectOption('sift');
  await page.locator('#design-picker').selectOption('starter');
  await page.reload();
  assert.deepEqual(await exportFeedback(page), deleted);
});

test('Delete and Backspace in the note editor edit text instead of deleting the selected note', async t => {
  const page = await openPage(t);
  await addNote(page, 'Keep this note.');
  const original = await exportFeedback(page);
  await page.locator('.note-pin').click();
  await page.locator('#note-text').fill('ab');
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  assert.equal(await page.locator('#note-text').inputValue(), 'a');
  await page.keyboard.press('Home');
  await page.keyboard.press('Delete');
  assert.equal(await page.locator('#note-text').inputValue(), '');
  assert.equal(await page.locator('.note-pin').count(), 1);
  await page.locator('#note-cancel').click();
  assert.deepEqual(await exportFeedback(page), original);
});

test('a failed selected deletion stays deleted across design switches and retry persists it', async t => {
  const page = await openPage(t);
  const lines = [[[100, 100], [200, 100]], [[100, 200], [200, 200]]];
  await seedFeedback(page, lines);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('frame-feedback-')) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.locator('#tool-select').click();
  await page.locator('#brush path').first().focus();
  await page.keyboard.press('Delete');
  assert.deepEqual((await exportFeedback(page)).lines, [lines[1]]);
  assert.match(await page.locator('#feedback-save-notice').textContent(), /Feedback is unsaved/);
  await page.locator('#design-picker').selectOption('sift');
  await page.locator('#design-picker').selectOption('starter');
  assert.deepEqual((await exportFeedback(page)).lines, [lines[1]]);
  await page.evaluate(() => window.restoreStorage());
  await page.locator('#retry-save').click();
  await page.reload();
  assert.deepEqual((await exportFeedback(page)).lines, [lines[1]]);
});

test('stroke selection uses screen-pixel tolerance after the design scales down', async t => {
  const page = await openPage(t);
  await seedFeedback(page, [[[100, 100], [200, 100]]]);
  await page.locator('#tool-select').click();
  await page.setViewportSize({width: 600, height: 700});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const board = await page.locator('#board').boundingBox();
  const x = board.x + 150 * board.width / 960;
  const y = board.y + 100 * board.height / 600;
  await page.mouse.click(x, y + 9);
  assert.equal(await page.locator('#delete-selected').isDisabled(), true);
  await page.mouse.click(x, y + 7);
  assert.equal(await page.locator('#brush path.selected').count(), 1);
  await page.locator('#delete-selected').click();
  assert.deepEqual(await savedLines(page), []);
});

async function savedFeedback(page, id = 'starter') {
  const data = await page.evaluate(id => JSON.parse(localStorage.getItem('frame-feedback-v3:' + id)), id);
  if (!data) return null;
  const projected = projectFeedback(data);
  return {version: 2, lines: projected.lines, notes: projected.notes};
}

test('undo/redo restores strokes, individual deletion, and clear with exact exported data', async t => {
  const page = await openPage(t);
  await beginMouse(page); await page.mouse.up();
  await addNote(page, 'Keep this note');
  const original = await savedFeedback(page);
  await page.locator('#tool-select').click();
  await page.locator('#brush path').focus();
  await page.locator('#delete-selected').click();
  assert.equal((await savedFeedback(page)).lines.length, 0);
  await page.locator('#undo').click();
  assert.deepEqual(await savedFeedback(page), original);
  assert.equal(await page.locator('#delete-selected').isDisabled(), true);
  await page.keyboard.press('Control+Shift+Z');
  assert.equal((await savedFeedback(page)).lines.length, 0);
  await page.keyboard.press('Control+Z');
  await page.locator('#clear').click();
  assert.deepEqual(await savedFeedback(page), {version: 2, lines: [], notes: []});
  await page.keyboard.press('Control+Z');
  assert.deepEqual(await savedFeedback(page), original);
  const exported = await exportFeedback(page);
  assert.deepEqual(exported.lines, original.lines);
  assert.deepEqual(exported.notes, original.notes);
  await page.keyboard.press('Control+Y');
  assert.equal(await page.locator('#notes-layer .note-pin').count(), 0);
  assert.equal(await page.locator('#brush path').count(), 0);
  await page.locator('#undo').click();
  await page.reload();
  assert.deepEqual(await savedFeedback(page), original);
  assert.equal(await page.locator('#undo').isDisabled(), true);
  assert.equal(await page.locator('#redo').isDisabled(), true);
});

test('notes undo through editing, arrow movement, dragging, deletion and creation without changing IDs', async t => {
  const page = await openPage(t);
  await addNote(page, 'Original');
  const original = await savedFeedback(page);
  await page.locator('.note-pin').click();
  await page.locator('#note-text').fill('Edited');
  await page.locator('#note-form button[type=submit]').click();
  const edited = await savedFeedback(page);
  await page.locator('#tool-select').click();
  await page.locator('.note-pin').focus();
  await page.keyboard.press('Shift+ArrowRight');
  const nudged = await savedFeedback(page);
  const pin = await page.locator('.note-number').boundingBox();
  await page.mouse.move(pin.x + pin.width / 2, pin.y + pin.height / 2);
  await page.mouse.down();
  await page.mouse.move(pin.x + pin.width / 2 + 40, pin.y + pin.height / 2 + 20, {steps: 5});
  await page.mouse.up();
  const dragged = await savedFeedback(page);
  assert.notDeepEqual(dragged, nudged);
  await page.locator('#delete-selected').click();
  for (const expected of [dragged, nudged, edited, original, {version: 2, lines: [], notes: []}]) {
    await page.locator('#undo').click();
    assert.deepEqual(await savedFeedback(page), expected);
  }
  assert.equal(await page.locator('#undo').isDisabled(), true);
  for (const expected of [original, edited, nudged, dragged, {version: 2, lines: [], notes: []}]) {
    await page.locator('#redo').click();
    assert.deepEqual(await savedFeedback(page), expected);
  }
  assert.equal(await page.locator('#redo').isDisabled(), true);
});

test('per-design undo and redo survive switching without crossing histories', async t => {
  const page = await openPage(t);
  await addNote(page, 'Starter feedback');
  const starter = await savedFeedback(page);
  await page.locator('#undo').click();
  await page.locator('#design-picker').selectOption('sift');
  assert.equal(await page.locator('#undo').isDisabled(), true);
  assert.equal(await page.locator('#redo').isDisabled(), true);
  await addNote(page, 'Sift feedback');
  const sift = await savedFeedback(page, 'sift');
  await page.locator('#design-picker').selectOption('starter');
  await page.locator('#redo').click();
  assert.deepEqual(await savedFeedback(page), starter);
  await page.locator('#design-picker').selectOption('sift');
  assert.deepEqual(await savedFeedback(page, 'sift'), sift);
  await page.locator('#undo').click();
  assert.equal((await savedFeedback(page, 'sift')).notes.length, 0);
  assert.deepEqual(await savedFeedback(page), starter);
});

test('new edits replace redo while cancelled and unchanged note edits preserve it', async t => {
  const page = await openPage(t);
  await addNote(page, 'Keep');
  await addNote(page, 'Undone', [500, 300]);
  await page.locator('#undo').click();
  await page.locator('.note-pin').click();
  await page.locator('#note-text').fill('Cancelled');
  await page.locator('#note-cancel').click();
  assert.equal(await page.locator('#redo').isDisabled(), false);
  await page.locator('.note-pin').click();
  await page.locator('#note-form button[type=submit]').click();
  assert.equal(await page.locator('#redo').isDisabled(), false);
  await page.locator('.note-pin').click();
  await page.locator('#note-text').fill('New edit');
  await page.locator('#note-form button[type=submit]').click();
  assert.equal(await page.locator('#redo').isDisabled(), true);
  await page.locator('#undo').click();
  assert.equal((await savedFeedback(page)).notes[0].text, 'Keep');
});

test('active stroke can be undone and redone after pointer release without duplicate commits', async t => {
  const page = await openPage(t);
  await beginMouse(page);
  await page.keyboard.press('Control+Z');
  assert.equal(await page.locator('#brush path').count(), 0);
  await page.mouse.move(800, 500);
  await page.mouse.up();
  await page.keyboard.press('Meta+Shift+Z');
  const restored = await savedFeedback(page);
  assert.equal(restored.lines.length, 1);
  await page.locator('#undo').click();
  assert.equal(await page.locator('#undo').isDisabled(), true);
  await page.locator('#tool-pen').click();
  await beginMouse(page);
  assert.equal(await page.locator('#redo').isDisabled(), true);
  await page.mouse.up();
  assert.equal(await page.locator('#redo').isDisabled(), true);
});

test('failed undo/redo saves stay in memory across designs and retry persists the current history state', async t => {
  const page = await openPage(t);
  await addNote(page, 'Recover me');
  const original = await savedFeedback(page);
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('frame-feedback-v3:')) throw new DOMException('Full', 'QuotaExceededError');
      return window.originalSetItem.call(this, key, value);
    };
  });
  await page.locator('#clear').click();
  await page.locator('#undo').click();
  assert.deepEqual((await exportFeedback(page)).notes, original.notes);
  await page.locator('#redo').click();
  assert.equal((await exportFeedback(page)).notes.length, 0);
  await page.locator('#design-picker').selectOption('sift');
  await page.locator('#design-picker').selectOption('starter');
  await page.locator('#undo').click();
  assert.equal(await page.locator('.note-pin').count(), 1);
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
  await page.locator('#retry-save').click();
  assert.equal(await page.locator('#retry-save').isHidden(), true);
  assert.deepEqual(await savedFeedback(page), original);
  await page.reload();
  assert.equal(await page.locator('.note-pin').count(), 1);
});

test('history shortcuts leave textarea native undo and redo available', async t => {
  const page = await openPage(t);
  await addNote(page, 'Saved');
  await page.locator('.note-pin').click();
  await page.locator('#note-text').press('End');
  await page.locator('#note-text').pressSequentially(' draft');
  await page.keyboard.press('Control+Z');
  assert.equal(await page.locator('#note-text').inputValue(), 'Saved');
  await page.keyboard.press('Control+Shift+Z');
  assert.equal(await page.locator('#note-text').inputValue(), 'Saved draft');
  assert.equal((await savedFeedback(page)).notes[0].text, 'Saved');
  await page.locator('#note-cancel').click();
  await page.locator('#undo').click();
  assert.equal((await savedFeedback(page)).notes.length, 0);
});

test('history retains the latest 100 changes and still saves and redoes the oldest retained state', async t => {
  const page = await openPage(t);
  await addNote(page, 'History boundary');
  await page.locator('#tool-select').click();
  await page.locator('.note-pin').focus();
  await page.evaluate(() => {
    const pin = document.querySelector('.note-pin');
    for (let i = 0; i < 101; i++) pin.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
    const undo = document.getElementById('undo');
    for (let i = 0; i < 100; i++) undo.click();
  });
  assert.equal(await page.locator('#undo').isDisabled(), true);
  assert.deepEqual((await savedFeedback(page)).notes[0].anchor, [301, 200]);
  await page.evaluate(() => {
    const redo = document.getElementById('redo');
    for (let i = 0; i < 100; i++) redo.click();
  });
  assert.deepEqual((await savedFeedback(page)).notes[0].anchor, [401, 200]);
  assert.equal(await page.locator('#redo').isDisabled(), true);
});

test('undo during a note drag reverses the completed gesture once and redo restores its position', async t => {
  const page = await openPage(t);
  await addNote(page, 'Drag recovery');
  const original = await savedFeedback(page);
  await page.locator('#tool-select').click();
  const pin = await page.locator('.note-number').boundingBox();
  await page.mouse.move(pin.x + pin.width / 2, pin.y + pin.height / 2);
  await page.mouse.down();
  await page.mouse.move(pin.x + pin.width / 2 + 40, pin.y + pin.height / 2 + 20, {steps: 3});
  assert.equal(await page.locator('#redo').isDisabled(), true);
  await page.keyboard.press('Control+Z');
  assert.deepEqual(await savedFeedback(page), original);
  await page.mouse.move(800, 500); await page.mouse.up();
  await page.locator('#redo').click();
  const dragged = await savedFeedback(page);
  assert.notDeepEqual(dragged.notes[0].anchor, original.notes[0].anchor);
  await page.locator('#undo').click();
  assert.deepEqual(await savedFeedback(page), original);
  await page.locator('#undo').click();
  assert.equal((await savedFeedback(page)).notes.length, 0);
});

test('Technical Futurist is the first guide and preserves the complete supplied document and prompt', async t => {
  const page = await openPage(t);
  assert.equal(await page.locator('#styleguide-picker option').first().textContent(), 'Technical Futurist');
  assert.equal(await page.locator('#styleguide-picker').inputValue(), 'technical-futurist');
  const source = await fs.readFile(path.join(root, 'styleguides/technical-futurist.md'), 'utf8');
  assert.equal(await page.evaluate(() => Frame.activeStyleguide.document), source);
  await page.locator('#view-styleguide').click();
  assert.equal(await page.locator('#styleguide-dialog').evaluate(dialog => dialog.open), true);
  assert.equal(await page.locator('#styleguide-title').textContent(), 'Technical Futurist');
  assert.equal(await page.locator('#styleguide-palette .guide-color').count(), 9);
  assert.equal(await page.locator('#styleguide-document').textContent(), source);
  assert.match(await page.locator('#styleguide-prompt').textContent(), /85–95%/);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-styleguide').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'technical-futurist.md');
  assert.equal(await fs.readFile(await download.path(), 'utf8'), source);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#styleguide-dialog').evaluate(dialog => dialog.open), false);
  assert.equal(await page.locator('#view-styleguide').evaluate(button => button === document.activeElement), true);
});

async function registerTestStyleguide(page) {
  await page.evaluate(() => {
    const original = Frame.styleguides.get('technical-futurist');
    Frame.registerStyleguide({...original, id: 'minimal', name: 'Minimal', summary: '<img src=x onerror=alert(1)>', prompt: 'A minimal guide'});
  });
}

test('guide selection repaints opt-in designs and retains feedback and independent per-design choices through reload', async t => {
  const page = await openPage(t, {setup: page => page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const original = Frame.styleguides.get('technical-futurist');
      Frame.registerStyleguide({...original, id: 'minimal', name: 'Minimal'});
      Frame.register({id: 'guided', name: 'Guided', width: 500, height: 400, paint(ctx, {styleguide}) {
        window.paintedGuide = styleguide?.id || null;
        ctx.fillStyle = styleguide?.tokens.palette[0].value || '#ffffff';
        ctx.fillRect(0, 0, 500, 400);
      }});
    });
  })});
  await beginMouse(page); await page.mouse.up();
  await addNote(page, 'Keep my feedback');
  const original = await savedFeedback(page);
  await page.locator('#styleguide-picker').selectOption('minimal');
  assert.deepEqual(await savedFeedback(page), original);
  assert.equal(await page.locator('.note-pin').count(), 1);
  await page.locator('#design-picker').selectOption('guided');
  assert.equal(await page.evaluate(() => window.paintedGuide), 'technical-futurist');
  await page.locator('#tool-pen').click();
  await beginMouse(page);
  await page.locator('#styleguide-picker').selectOption('minimal');
  await page.mouse.up();
  assert.equal(await page.evaluate(() => window.paintedGuide), 'minimal');
  assert.equal(await page.locator('#brush path').count(), 1);
  await page.locator('#undo').click();
  assert.equal(await page.locator('#brush path').count(), 0);
  await page.locator('#design-picker').selectOption('sift');
  assert.equal(await page.locator('#styleguide-picker').inputValue(), 'technical-futurist');
  await page.locator('#design-picker').selectOption('starter');
  assert.equal(await page.locator('#styleguide-picker').inputValue(), 'minimal');
  await page.reload();
  assert.equal(await page.locator('#styleguide-picker').inputValue(), 'minimal');
  assert.deepEqual(await savedFeedback(page), original);
});

test('guide registration rejects invalid and duplicate definitions and renders guide text safely', async t => {
  const page = await openPage(t);
  assert.deepEqual(await page.evaluate(() => [
    Frame.registerStyleguide({id: 'broken'}),
    Frame.registerStyleguide({...Frame.activeStyleguide, id: 'technical-futurist', name: 'Replacement'})
  ]), [false, false]);
  assert.equal(await page.locator('#styleguide-registration-notice').isVisible(), true);
  assert.equal(await page.locator('#styleguide-picker option').count(), 1);
  await registerTestStyleguide(page);
  assert.equal(await page.locator('#styleguide-picker option').count(), 2);
  await page.locator('#styleguide-picker').selectOption('minimal');
  await page.locator('#view-styleguide').click();
  assert.equal(await page.locator('#styleguide-summary').textContent(), '<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('#styleguide-summary img').count(), 0);
});

test('guide picker and reader remain usable at 320px without capturing feedback shortcuts', async t => {
  const page = await openPage(t);
  await addNote(page, 'Do not undo while reading');
  await page.setViewportSize({width: 320, height: 740});
  await page.locator('#view-styleguide').click();
  await page.keyboard.press('Control+Z');
  await page.keyboard.press('p');
  assert.equal(await page.locator('#tool-note').getAttribute('aria-pressed'), 'true');
  assert.equal((await savedFeedback(page)).notes.length, 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator('#styleguide-dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth), true);
  await page.locator('#close-styleguide').click();
  await page.locator('#undo').click();
  assert.equal((await savedFeedback(page)).notes.length, 0);
});

test('guide selection survives unavailable storage in memory and clipboard errors have a usable fallback', async t => {
  const page = await openPage(t);
  await registerTestStyleguide(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError'); };
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async () => { throw new Error('Denied'); }}});
  });
  await page.locator('#styleguide-picker').selectOption('minimal');
  await page.locator('#design-picker').selectOption('sift');
  await page.locator('#design-picker').selectOption('starter');
  assert.equal(await page.locator('#styleguide-picker').inputValue(), 'minimal');
  await page.locator('#view-styleguide').click();
  await page.locator('#copy-styleguide-prompt').click();
  assert.match(await page.locator('#styleguide-action-status').textContent(), /Clipboard unavailable/);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async text => { window.copiedPrompt = text; }}});
  });
  await page.locator('#copy-styleguide-prompt').click();
  assert.equal(await page.evaluate(() => window.copiedPrompt), 'A minimal guide');
  assert.equal(await page.locator('#styleguide-action-status').textContent(), 'Prompt copied.');
});

test('missing and stale guide selections recover when a guide becomes available', async t => {
  const page = await openPage(t, {setup: page => page.route('**/styleguides/technical-futurist.js', route => route.fulfill({contentType: 'application/javascript', body: ''}))});
  assert.equal(await page.locator('#styleguide-picker').isDisabled(), true);
  assert.equal(await page.locator('#view-styleguide').isDisabled(), true);
  await page.evaluate(() => localStorage.setItem('frame-styleguide:starter', 'missing'));
  await page.addScriptTag({url: baseURL + '/styleguides/technical-futurist.js?late=1'});
  assert.equal(await page.locator('#styleguide-picker').isDisabled(), false);
  assert.equal(await page.locator('#styleguide-picker').inputValue(), 'technical-futurist');
  await page.locator('#view-styleguide').click();
  assert.equal(await page.locator('#styleguide-title').textContent(), 'Technical Futurist');
});

test('the embedded guide reader also works when index.html is opened directly', async t => {
  const page = await openPage(t);
  try { await page.goto('file://' + path.join(root, 'index.html')); }
  catch (error) {
    if (error.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) {
      t.skip('This Chromium installation blocks file URLs by administrator policy');
      return;
    }
    throw error;
  }
  assert.equal(await page.locator('#styleguide-picker').inputValue(), 'technical-futurist');
  await page.locator('#view-styleguide').click();
  assert.match(await page.locator('#styleguide-document').textContent(), /# 72. Compact Master Specification/);
  assert.equal(await page.locator('#styleguide-palette .guide-color').count(), 9);
});

test('v3 mark identity and timestamps survive editing, history, switching, reload and export', async t => {
  const page = await openPage(t);
  await page.evaluate(() => { Frame.designs.get('starter').revisionId = 'r1'; });
  await beginMouse(page); await page.mouse.up();
  await addNote(page, 'Metadata');
  const initial = await exportFeedback(page, true);
  assert.equal(initial.version, 3);
  assert.equal(initial.revisionId, 'r1');
  assert.equal(initial.lines[0].type, 'stroke');
  assert.equal(initial.notes[0].type, 'note');
  assert.notEqual(initial.lines[0].id, initial.notes[0].id);
  for (const mark of [...initial.lines, ...initial.notes]) {
    assert.equal(mark.designId, 'starter');
    assert.equal(mark.revisionId, 'r1');
    assert.ok(Number.isFinite(Date.parse(mark.createdAt)));
  }
  await page.locator('.note-pin').click();
  await page.locator('#note-text').fill('Changed');
  await page.locator('#note-save').click();
  const edited = await exportFeedback(page, true);
  assert.equal(edited.notes[0].createdAt, initial.notes[0].createdAt);
  assert.ok(edited.notes[0].updatedAt >= initial.notes[0].updatedAt);
  await page.locator('#undo').click();
  assert.deepEqual((await exportFeedback(page, true)).notes, initial.notes);
  await page.locator('#redo').click();
  await page.locator('#design-picker').selectOption('sift');
  await page.locator('#design-picker').selectOption('starter');
  assert.deepEqual((await exportFeedback(page, true)).notes, edited.notes);
  await page.reload();
  const reloaded = await exportFeedback(page, true);
  assert.deepEqual(reloaded.lines, initial.lines);
  assert.deepEqual(reloaded.notes, edited.notes);
});

test('v2 backups remain untouched, migration IDs are stable before save, and corrupt v3 cannot be overwritten', async t => {
  const page = await openPage(t);
  const legacy = {version:2,lines:[[[10,10],[20,20]]],notes:[{id:'old-note',text:'Older',anchor:[50,50]}]};
  await seedFeedback(page, legacy, 'frame-feedback-v2:starter');
  const exported = await exportFeedback(page, true);
  await page.reload();
  assert.deepEqual(await exportFeedback(page, true), exported);
  await beginMouse(page); await page.mouse.up();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('frame-feedback-v2:starter'))), legacy);
  assert.equal((await exportFeedback(page,true)).notes[0].id, 'old-note');
  const corrupt = '{"version":99,"valuable":"keep this"}';
  await page.evaluate(raw=>localStorage.setItem('frame-feedback-v3:starter',raw),corrupt);
  await page.reload();
  assert.match(await page.locator('#feedback-save-notice').textContent(), /not be overwritten/);
  await beginMouse(page); await page.mouse.up();
  assert.equal(await page.evaluate(()=>localStorage.getItem('frame-feedback-v3:starter')), corrupt);
  assert.equal((await exportFeedback(page,true)).lines.length,1);
  assert.match(await page.locator('#feedback-save-notice').textContent(), /protected/);
});
