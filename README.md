# Frame

Frame is a small, code-painted UI design canvas for sketching application interfaces and collecting visual feedback. It uses plain HTML, CSS, JavaScript, and Canvas 2D; there is no build step. Its controls include a design picker, a red annotation brush, and optional interactive controls supplied by a design. Agents or developers change the interface by editing its design script.

Run `node server.js` and open `http://127.0.0.1:8765/` to use Frame. The local server serves the canvas and receives annotation feedback at `/api/feedback`, saving it to `feedback/<design>.json` in the workspace. That folder is ignored by Git. Annotations also remain in browser `localStorage`, and **Download feedback** remains available if automatic sync is unavailable. **Starter UI** is a neutral example, **Sift example** preserves the earlier VST mockup, and **Freqs tuner concept** explores a microtonal tuning interface. These are visual mockups, not functional application controls or generated VST code.

The Freqs concept has a scrollable node list with linked Hz and cents inputs, add/remove buttons, and a live numbered pitch line. Node edits persist in this browser. The upper panels divide the width evenly between the list and a variation landscape. The die button repaints the concept's candidate field. The tuning, scale, and audition controls remain visual mockups; this preview does not send tuning data or play audio.

## Add a design

Create a JavaScript file in `examples/` (or another folder) and load it after `frame.js` and before `app.js` in `index.html`:

```js
Frame.register({
  id: "my-interface",
  name: "My interface",
  width: 1000,
  height: 600,
  paint(ctx) {
    ctx.fillStyle = "#202526";
    ctx.fillRect(0, 0, 1000, 600);
    // Draw shapes, text, paths, gradients, and images here.
  }
});
```

The drawing coordinates use the registered width and height. Frame scales the board to fit the window and renders at device resolution. Edit the design script or styles and click **Refresh** to load the changes without reloading the page. The selected design and saved annotations stay in place; Freqs also retains its node values. Refresh failures keep the previous design visible and put the error in the button's tooltip. Changes to Frame's own HTML or runtime scripts still require a page reload. Annotations remain aligned with the design's coordinates, even after resizing.

A design can optionally provide `mount({host, repaint})` to add DOM controls in design coordinates. The host scales with the canvas and ignores pointer input outside the controls. Call `repaint()` after updating design state and return a cleanup function; Frame calls it when switching designs. Interactive controls sit above the brush so inputs and scrolling remain usable.

## Feedback

Draw red lines anywhere in the stage, including outside the interface. Hold **Shift** while dragging for a straight line. **Undo line** (or Command/Ctrl+Z) removes the latest stroke; **Clear all lines** removes every stroke for the selected design. Feedback is saved separately for each design in browser `localStorage` and automatically synced to `feedback/<design>.json` when using the local server. Existing Sift brush marks saved by the earlier canvas are loaded and synced automatically. **Download feedback** exports the selected design's dimensions and strokes as JSON and remains the fallback when automatic sync is unavailable.

The Sift reference screenshot in `assets/` is source material for that example. The app paints its visible interface live from code and does not display the screenshot.
