# Frame

Frame is a UI design tool built specifically for AI agents. Its goal is to give AI the right tools to create, review, test, and refine interface designs quickly, with a simple visual toolkit for humans to give feedback.

AI handles the design work; humans guide it by pointing directly at what needs to change. Circle an element with a red pen, place a note beside a button, or mark an area that feels too crowded. Frame should give the AI enough visual and structured context to understand that feedback and turn it into a precise revision.

## The vision

Design tools usually assume a human will operate every control. Frame puts AI at the center of the workflow: creating and editing a design should be easy to automate, inspecting the result should be reliable, and feedback should be tied to the relevant part of the interface.

The intended toolset covers four activities:

- **Create:** Build screens, layouts, components, and design variations through a predictable, programmatic interface.
- **Review:** Render designs and inspect visual details, hierarchy, spacing, typography, and consistency.
- **Test:** Preview different screen sizes and interface states, exercise interactions, and check usability and accessibility where the design supports them.
- **Refine:** Read human feedback in context, make targeted changes, and compare revisions.

The aim is a short loop from an idea to a visible design, from feedback to a change, and from a change to a checked result.

## Human feedback

Giving feedback should require very little setup or knowledge of design software. The intended toolkit includes:

- **Red pen:** Circle, underline, cross out, or draw directly over the design.
- **Placed annotations:** Attach a text note to a specific position or element.
- **Context for AI:** Associate feedback with the relevant screen, location, and design revision so an agent can understand what the human is referring to.

For example, a human could circle a toolbar and add “Give these controls more space.” The AI could then adjust the layout, review the result, and present the revised design for another pass.

The red pen is available in the current prototype. Placed text annotations and revision-aware feedback are planned capabilities.

## Current prototype

Frame currently provides a code-painted design canvas using plain HTML, CSS, JavaScript, and Canvas 2D, with no build step. Agents or developers edit design scripts; humans select a design and draw feedback over it.

Available today:

- Register and render multiple designs from JavaScript.
- Scale the board to fit the window and render at device resolution.
- Draw freehand red marks or straight lines, with undo and clear controls.
- Keep marks aligned with design coordinates when the board resizes.
- Save feedback per design in browser `localStorage` and export strokes as JSON.

The included designs are visual mockups. Interactive prototypes, automated review and testing tools, placed annotations, and revision comparisons are part of the vision, not implemented features.

## Run locally

Open `index.html` in a browser, or serve this folder:

```sh
python3 -m http.server 8765
```

Then open <http://127.0.0.1:8765/>. **Starter UI** is a neutral example. **Sift example** preserves the original VST mockup and its traced waveform as a separate design; it does not generate functional VST code.

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

## Browser tests

The app itself needs no build step or dependencies. To run the feedback regression tests, use Node.js 20 or newer:

```sh
npm ci
npx playwright install chromium
npm test
```

To use an existing Chromium installation, run `FRAME_BROWSER_PATH=/path/to/chromium npm test` instead. Tests serve the app locally and exercise it in a headless browser with isolated storage.
