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

The red pen and placed annotations are available. Structured designs also preserve revision snapshots and element-bound feedback.

## Current prototype

Frame uses plain HTML, CSS, JavaScript, and Canvas 2D, with no build step. Agents create and edit structured documents through the browser API or register custom Canvas scripts; humans review designs and place feedback over them.

Available today:

- Register and render multiple designs from JavaScript.
- Choose a styleguide per design; read its rules, palette, tokens, and AI prompt.
- Scale the board to fit the window and render at device resolution.
- Draw freehand red marks or straight lines, with undo, redo, and recoverable clear controls.
- Switch between Pen, Note, and Select tools; place, edit, move, and delete text notes.
- Keep marks aligned with design coordinates when the board resizes.
- Save feedback per design in browser `localStorage` and export strokes and notes as JSON.

The original Canvas examples are visual mockups. Instrument workstation adds a structured prototype with responsive layouts and interactive controls. Viewport/state selectors, zoom/pan/fit, structural checks, semantic checks of actual controls, and repeatable visual/interaction comparisons are available through the toolbar and browser API. See docs/agent-api.md for their scope and limitations.

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

## Styleguides

Choose a **Styleguide** in the toolbar, then **View guide** for a quick reference, palette, typography, spacing, geometry, and an AI prompt. **Technical Futurist** is the first entry: restrained, believable near-future instrumentation with compact technical typography, fine structural lines, and selective accents. The complete guide, including the priority rules for refinement and information discipline, is maintained in [styleguides/technical-futurist.md](styleguides/technical-futurist.md), available in the reader and through **Download full guide**. **Copy prompt** copies its compact master specification; if clipboard access fails, select the prompt text or download the guide.

Selection is remembered separately for each design in browser storage, with an in-memory fallback if storage is unavailable. Existing feedback and history remain associated with the design when its guide changes. Guides provide design direction; existing Canvas scripts use their own styling until they opt into the selected tokens:

```js
paint(ctx, {styleguide}) {
  ctx.fillStyle = styleguide?.tokens.palette[0].value || "#171c1d";
  ctx.fillRect(0, 0, 1000, 600);
}
```

**Sift Hardware** is a separate, text-only guide derived from the supplied SIFT idle and waveform screenshots. It covers graphite-green materials, recessed displays, clipped control geometry, monospaced typography, the idle dot field, layered purple/coral waveforms, and rules for applying this style to other products. Its [full specification](styleguides/sift-hardware.md) distinguishes observed states from proposed interaction rules and includes a compact AI prompt. It is available in the picker, reader, prompt copy, and Markdown download, including when Frame is opened directly from disk.

A guide change repaints the selected design. Agents can inspect `Frame.activeStyleguide` or list `Frame.styleguides` to obtain the full document, compact prompt, rules, and tokens. The first supplied palette color is a surface. Follow the selected guide's color roles: Technical Futurist offers alternative accent families, while Sift Hardware uses distinct coral and purple roles for layered signal data.

To add another guide, load a script after `frame.js` and before `styleguide-picker.js` that calls `Frame.registerStyleguide({id, name, summary, document, prompt, rules, tokens})`. IDs use lowercase letters, numbers, and hyphens. `rules` is an array of strings; `tokens` contains `palette: [{name, value}]` with six-digit hex colors and string values for `typography`, `spacing`, and `geometry`. See [the first entry](styleguides/technical-futurist.js) for the full definition. The registry returns `false` for invalid or duplicate definitions, preserves the original, and reports errors in the footer; valid guides registered after startup appear in the picker.

Guides are embedded in ordinary scripts so the reader also works when opening `index.html` directly. When editing a guide, keep its embedded `document` and Markdown source in sync. Applying a guide does not yet create revision snapshots or separate feedback by style variation.

## Structured designs and agent operations

The **Instrument workstation** example uses a serializable design document with stable element IDs, hierarchy, bounds, styles, reusable primitives, shared tokens, and viewport/state data. Register documents with Frame.registerDocument and edit them through Frame.agent. Agents can inspect elements, hit-test positions, apply atomic editing batches, refresh designs without reloading, and export PNGs with or without feedback. Marks on structured elements retain an element anchor and their original revision context. See [the browser API](docs/agent-api.md) for operations and limits.

## Feedback

Selected marks can be resolved or reopened. Filter the canvas to All, Open, or Resolved; filtering preserves every mark in saves and exports. Status changes support undo/redo and persist across reload. Agents use Frame.feedback.list(status) and Frame.feedback.setStatus(id,status) for the selected design. Legacy marks start open.

Choose **Pen** (shortcut **P**) to draw, **Note** (**N**) to place or edit text annotations, or **Select** (**V**) to inspect a line or note. Select a line by clicking within eight screen pixels of it or focusing it with Tab; the selected mark is highlighted. Click empty space or press Escape to deselect. Changing tools finishes an active stroke safely. Frame shortcuts leave normal editing and undo behavior intact inside text inputs, textareas, and editable text.

Use **Delete selected**, **Delete**, or **Backspace** to remove only the selected line or note. Selection clears afterward, and focus returns to the active tool. Deletion keeps unrelated marks and is saved and exported normally; failed saves remain recoverable through the unsaved feedback flow. Deletions can be undone and redone.

Draw red lines anywhere in the stage, including outside the interface. Hold **Shift** while dragging for a straight line. **Undo** (Command/Ctrl+Z) reverses the latest feedback change. **Redo** (Command/Ctrl+Shift+Z or Ctrl+Y) reapplies it. **Clear feedback** removes strokes and notes for the selected design and can be undone. Feedback is saved separately for each design in browser `localStorage`. **Download feedback** exports the selected design's dimensions, strokes, and notes as JSON. Existing Sift brush marks saved by the earlier canvas are loaded automatically.

In **Note** mode, Tab to the feedback canvas to place notes by keyboard: arrows move the visible crosshair ten design units, Shift+arrows move one, and Enter or Space opens the editor. Existing marks remain available through Tab, selection, resolve/reopen, Delete, and visible focus.

In **Note** mode, click a location to open the note editor, write your request, and choose **Save note** (or Command/Ctrl+Enter). Click an existing note to edit or delete it. In **Select** mode, double-click a note or focus it and press Enter to edit. Drag a note to move it, or use arrow keys while the note is focused; arrows move one design unit, and Shift+arrows move ten. Cancel or Escape discards the draft; a cancelled drag restores its previous anchor. Notes stay aligned with design coordinates when the board resizes.

New notes allow up to **4,000 characters**, with **1,000 notes per design**. Longer previews are shortened on the canvas; the editor and export retain the full saved text. Undo and redo cover drawing, note creation and edits, dragging, each arrow-key move, individual deletion, and clearing feedback.

History retains the last **100 changes per design** during the current browser session, including across design switches. A new change replaces that design's redo branch; cancelled or unchanged note edits leave it available. Undo during a stroke or note drag finishes the gesture, then reverses it. Feedback saves after undo and redo, and remains available for export and retry if storage fails. Reloading keeps saved feedback but starts fresh history. History reads each design's storage on its first visit; edits in another browser tab appear after reload.

Strokes and notes save together in a [version 3 feedback document](docs/feedback-schema.md) under frame-feedback-v3:<design-id>, with stable mark IDs, types, design/revision context, timestamps, and optional element anchors. Storage and export share the format. Version 2 documents, version 1 arrays, and the original Sift key migrate without overwriting old backups. Unknown historic dates and revisions remain null. Design scripts can register a revisionId; structured documents retain full revision snapshots. Unreadable saved documents are protected from replacement.

**Import feedback** accepts v3 documents, v2 feedback, and legacy stroke arrays. Choose a file and review its design, dimensions, and mark counts before **Replace feedback**. Wrong-design, mismatched-size, malformed, or duplicate-ID documents are rejected before any marks change. Import is undoable; export preserves IDs, timestamps, optional anchors, text, and coordinates. Oversized older marks are retained. Failed saves remain available for export and retry.

New drawings are limited to **1,000 lines per design** and **5,000 points per line**. At the line-count limit, delete, undo, or clear lines before drawing more. A line automatically ends and saves when it reaches the point limit; lift your pointer and start a new line to continue. Frame displays a message when either limit is reached. Points less than one design unit apart are not recorded.

Older feedback above these limits is preserved in full when loaded, saved, and exported. Frame displays a notice for it and blocks new lines if the design already has 1,000 or more. These drawing limits do not guarantee that the browser has enough storage available.

If saving fails because browser storage is full or unavailable, Frame shows an **unsaved feedback** notice and a **Retry save** button. Drawing and JSON export remain available, and unsaved feedback stays in memory when switching designs. Download a backup before closing or reloading; the browser may also prompt before leaving with unsaved changes. The notice clears after a successful save. A failed clear is also an unsaved change: it can be exported as an empty feedback file or retried.

The Sift reference screenshot in `assets/` is source material for that example. The app paints its visible interface live from code and does not display the screenshot.

## Revisions and portable handoff

Structured design edits preserve snapshots with immutable revision IDs. The Revision picker restores a snapshot; Compare shows changes by element ID and side-by-side or overlay views. Snapshots persist in browser storage and are included in project downloads. A saved browser draft resumes when its source revision has not changed; changing the source revision starts a new source snapshot. Storage failures show a project notice, retry, and a download path instead of discarding the in-memory project.

Feedback retains the revision and viewport originally reviewed. Bound marks follow surviving element IDs when layouts move; removed or hidden targets and position-only marks are flagged for review. Moving a bound note updates its offset. These rules preserve human context instead of silently assigning a different element.

Download project bundles the document, embedded assets, all stored revisions, complete feedback, the selected guide, viewport, state, and prototype input values into a versioned JSON file. Import project validates every dependency and adds a new design; existing design IDs and conflicting guides are protected. Use a fresh browser or rename design IDs consistently before importing an existing example. Portable imports are limited to 32 MB and image assets to embedded PNG/JPEG/WebP data. Custom Canvas callbacks stay in source files and cannot be serialized.

## Complete example

For a guide-only Sift comparison, select **Sift · style studies**. The current pair is **sift-technical-futurist-r6** (reference-led near-black instrumentation with fine warm frames, restrained orange signals and square controls) and **sift-hardware-r5** (clearance-corrected insets and controls with a closer hardware treatment with crafted icons, eased metal insets, substantial irregular waveforms, and a single composite overview). The first experiments, **sift-technical-futurist-r1** and **sift-hardware-r2**, remain available as historical comparisons. Technical Futurist r3 remains available to compare the earlier style direction; Hardware r4 remains available to compare the inset and spacing correction. New or upgraded archives start on r6; later reloads preserve the revision you selected. Select a revision to load it immediately; **Compare revisions** shows them together. Each revision selects its corresponding guide. The State picker offers populated, idle, and recording-prototype states. Each comparison pair uses a shared synthetic signal generated from code, not screenshot-extracted waveforms. In the refined pair, provenance is stored in document metadata and explained here instead of appearing as decorative text inside the device. The revised written guides were used to generate the new pair; the screenshots informed the guide review rather than serving as rendering assets. Prototype buttons demonstrate state changes; they do not record, play, or export real audio. Existing Sift example and feedback are preserved.

Run FRAME_BROWSER_PATH=/path/to/chromium npm run example (or npm run example with Playwright Chromium installed). The example opens Instrument workstation, places a human note through the UI, reads its element anchor, applies a targeted spacing edit, compares revisions and pixels, tests desktop and phone states, resolves the feedback, and exports before/after PNGs plus a portable project and review report into artifacts/. FRAME_OUTPUT_DIR can choose another output folder.

## Browser tests

The app itself needs no build step or dependencies. Local CI requires Node.js 20 or newer and npm:

```sh
npm run ci
```

This installs locked dependencies and Playwright Chromium, runs the model/browser regression tests, and runs the complete review example. It stops on failure and writes a stage report plus example artifacts to `artifacts/local-ci/`. To use an existing Chromium installation, run `FRAME_BROWSER_PATH=/path/to/chromium npm run ci` instead. Tests serve the app locally and exercise it in a headless browser with isolated storage. After setup, `npm test` runs just the tests and `npm run example` runs just the example.

The suite covers drawing and pointer recovery, undo/clear, drawing limits, storage failures and retry, design error recovery, and the full draw → resize → switch → reload → export workflow. It measures SVG endpoint alignment with the design and checks marks outside the board. Run local CI before submitting or accepting changes. GitHub-hosted Actions has been removed; there is no automatic remote check. See [CI troubleshooting](docs/ci-troubleshooting.md) for reports, browser setup, and the reason for switching.
