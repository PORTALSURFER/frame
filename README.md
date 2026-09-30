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

The red pen and placed text annotations are available in the current prototype. Revision-aware feedback is a planned capability.

## Current prototype

Frame currently provides a code-painted design canvas using plain HTML, CSS, JavaScript, and Canvas 2D, with no build step. Agents or developers edit design scripts; humans select a design and draw or place feedback over it.

Available today:

- Register and render multiple designs from JavaScript.
- Scale the board to fit the window and render at device resolution.
- Draw freehand red marks or straight lines, with undo and clear controls.
- Switch between Pen, Note, and Select tools; place, edit, move, and delete text notes.
- Keep marks aligned with design coordinates when the board resizes.
- Save feedback per design in browser `localStorage` and export strokes and notes as JSON.

The included designs are visual mockups. Interactive prototypes, automated design review and testing tools, and revision comparisons are part of the vision, not implemented features.

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

`Frame.register` returns `true` for a valid design. Invalid definitions and duplicate IDs return `false` and are recorded in `Frame.errors`; duplicate IDs keep the original design. Frame shows registration errors in the footer and displays an empty state when no valid designs are available. Designs registered after startup are added to the picker automatically.

If a design's paint function fails, Frame shows a render error with details and a **Retry render** action. Choose another design to continue working. Existing feedback remains available for export, and a successful retry restores the canvas and its marks.

## Feedback

Choose **Pen** (shortcut **P**) to draw, **Note** (**N**) to place or edit text annotations, or **Select** (**V**) to inspect a line or note. Select a line by clicking within eight screen pixels of it or focusing it with Tab; the selected mark is highlighted. Click empty space or press Escape to deselect. Changing tools finishes an active stroke safely. Frame shortcuts leave normal editing and undo behavior intact inside text inputs, textareas, and editable text.

Use **Delete selected**, **Delete**, or **Backspace** to remove only the selected line or note. Selection clears afterward, and focus returns to the active tool. Deletion keeps unrelated marks and is saved and exported normally; failed saves remain recoverable through the unsaved feedback flow. Deletions are not yet undoable.

Draw red lines anywhere in the stage, including outside the interface. Hold **Shift** while dragging for a straight line. **Undo line** (or Command/Ctrl+Z) removes the latest stroke; **Clear feedback** removes strokes and notes for the selected design. Feedback is saved separately for each design in browser `localStorage`. **Download feedback** exports the selected design's dimensions, strokes, and notes as JSON. Existing Sift brush marks saved by the earlier canvas are loaded automatically.

In **Note** mode, click a location to open the note editor, write your request, and choose **Save note** (or Command/Ctrl+Enter). Click an existing note to edit or delete it. In **Select** mode, double-click a note or focus it and press Enter to edit. Drag a note to move it, or use arrow keys while the note is focused; arrows move one design unit, and Shift+arrows move ten. Cancel or Escape discards the draft; a cancelled drag restores its previous anchor. Notes stay aligned with design coordinates when the board resizes.

New notes allow up to **4,000 characters**, with **1,000 notes per design**. Longer previews are shortened on the canvas; the editor and export retain the full saved text. Undo currently applies to strokes; undo/redo for note edits and clears is planned.

Strokes and notes save together in a version 2 feedback document under `frame-feedback-v2:<design-id>`. Version 1 stroke arrays and the original Sift storage key remain readable; editing saves the new format without overwriting those legacy backups. Exports include `version`, `design`, `width`, `height`, `lines`, and `notes`; each note has a stable `id`, `text`, and `[x, y]` anchor. Complete per-mark revision metadata is planned.

New drawings are limited to **1,000 lines per design** and **5,000 points per line**. At the line-count limit, undo or clear lines before drawing more. A line automatically ends and saves when it reaches the point limit; lift your pointer and start a new line to continue. Frame displays a message when either limit is reached. Points less than one design unit apart are not recorded.

Older feedback above these limits is preserved in full when loaded, saved, and exported. Frame displays a notice for it and blocks new lines if the design already has 1,000 or more. These drawing limits do not guarantee that the browser has enough storage available.

If saving fails because browser storage is full or unavailable, Frame shows an **unsaved feedback** notice and a **Retry save** button. Drawing and JSON export remain available, and unsaved feedback stays in memory when switching designs. Download a backup before closing or reloading; the browser may also prompt before leaving with unsaved changes. The notice clears after a successful save. A failed clear is also an unsaved change: it can be exported as an empty feedback file or retried.

The Sift reference screenshot in `assets/` is source material for that example. The app paints its visible interface live from code and does not display the screenshot.

## Browser tests

The app itself needs no build step or dependencies. To run the feedback regression tests, use Node.js 20 or newer:

```sh
npm ci
npx playwright install chromium
npm test
```

To use an existing Chromium installation, run `FRAME_BROWSER_PATH=/path/to/chromium npm test` instead. Tests serve the app locally and exercise it in a headless browser with isolated storage.

The suite covers drawing and pointer recovery, undo/clear, drawing limits, storage failures and retry, design error recovery, and the full draw → resize → switch → reload → export workflow. It measures SVG endpoint alignment with the design and checks marks outside the board. GitHub Actions is configured to run these checks on pull requests and updates to `main` using Playwright's Chromium. Hosted execution remains unverified: the initial run and retry failed before any job steps ran; the follow-up is tracked in `todo.md`.
