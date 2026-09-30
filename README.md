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

## Pump study

**Pump · Dual band** is the initial design. **Pump · Spectral ducking** shows the companion spectral panel. Both use Pump's factory curve nodes and tension interpolation, Pump’s original dark gray/red-orange palette, a compact 640 × 400 canvas, thin borders, and flat controls. The dual-band controls occupy a single 29-pixel row beneath the quick slots. The dual view has one crossover, 12/24 dB slopes, a compact stacked group of mint LP and blue HP mix sliders with no thumb handles, plus solos. Both bands share one envelope. The spectral view has 24 illustrative spectrum bars, depth, attack, release and Volume/Depth envelope modes. These remain visual mockups; the spectrum is illustrative and the red brush collects feedback.

Run `python3 scripts/build-standalone.py` to regenerate `frame-standalone.html`. That portable artifact embeds all styles and scripts and works in viewers that cannot load sibling files. Saved design selections still take precedence over the initial Pump view.

The main envelope view includes a crossover overlay spanning the full graph with mint low-pass and blue high-pass responses, translucent band fills, a crossover marker, and a separate logarithmic 20 Hz–20 kHz scale. Its frequency axis is independent of the envelope's time axis.

Smooth and Swing use horizontal sliders without handles; Mix and Output retain their rotary knobs.

The composition groups stacked LP/HP mix sliders beside Mix/Output, with Smooth/Swing in the compact strip immediately below the curve presets. The strip retains the crossover slope and spectral settings; dual enable and crossover frequency remain host parameters.
