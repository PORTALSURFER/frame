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
  const context = await browser.newContext({viewport: {width: 1280, height: 900}, ...options});
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'no uncaught browser errors'));
  await page.goto(baseURL);
  await page.locator('#design-picker').selectOption('starter');
  return page;
}

async function savedLines(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('frame-feedback-v1:starter') || '[]'));
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

async function exportFeedback(page) {
  const downloaded = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await downloaded;
  return JSON.parse(await fs.readFile(await download.path(), 'utf8'));
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
  await page.locator('#undo').click();
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
  await page.locator('#undo').click();
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
