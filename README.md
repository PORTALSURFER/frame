# Frame

Frame is a small, code-painted UI design canvas for sketching application interfaces and collecting visual feedback. It uses plain HTML, CSS, JavaScript, and Canvas 2D; there is no build step. The user-facing controls are a design picker and a red annotation brush. Agents or developers change the actual interface by editing its design script.

Open `index.html` in a browser, or serve this folder with `python3 -m http.server 8765` and open `http://127.0.0.1:8765/`. The included **Starter UI** is a neutral example. **Sift example** preserves the original VST mockup and its traced waveform as a separate design. These are visual mockups, not functional application controls or generated VST code.

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

The drawing coordinates use the registered width and height. Frame scales the board to fit the window and renders at device resolution. Edit the script and reload to see changes. Annotations remain aligned with the design's coordinates, even after resizing.

## Feedback

Draw red lines anywhere in the stage, including outside the interface. Hold **Shift** while dragging for a straight line. **Undo line** (or Command/Ctrl+Z) removes the latest stroke; **Clear all lines** removes every stroke for the selected design. Feedback is saved separately for each design in browser `localStorage`. **Download feedback** exports the selected design's dimensions and strokes as JSON. Existing Sift brush marks saved by the earlier canvas are loaded automatically.

The Sift reference screenshot in `assets/` is source material for that example. The app paints its visible interface live from code and does not display the screenshot.
