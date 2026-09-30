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
