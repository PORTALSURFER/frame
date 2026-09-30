# Frame implementation todo

This backlog follows a source review of `README.md`, `frame.js`, `app.js`, `index.html`, `style.css`, and the example designs. Checked items have been implemented and verified with Chromium browser tests; unchecked items are proposed work.

## What we have

- A small browser app with no build step and two example designs.
- A `Frame.register` API for fixed-size designs painted with Canvas 2D.
- Design and styleguide pickers, automatic board scaling, and Pen, Note, and Select tools.
- Freehand and Shift-constrained lines, placed/editable/movable notes, per-design undo/redo, recoverable clear, per-design browser storage, and JSON feedback export.
- A README describing the AI-first product vision and current limitations.

The main gap is the feedback-to-revision loop. An agent can edit a drawing script and read positioned written feedback, but Frame cannot yet identify the elements in that drawing, attach notes to stable element identities, or expose design review and testing operations. Fitting a fixed canvas into a window also does not test a responsive layout.

## 1. Make existing feedback reliable

- [x] **Track the active pointer.** Ignore other pointers during a stroke and handle pointer cancellation and lost capture consistently. Verified in Chromium with mouse, touch, and pen input and cancellation/lost-capture regression checks.
- [x] **Make undo and clear safe during drawing.** Finish the active stroke before changing history and enable controls when drawing begins. Verified keyboard undo with and without previous feedback, both controls during drawing, continued drawing, and reload persistence in Chromium.
- [x] **Handle empty coalesced pointer events.** Fall back to the original event when `getCoalescedEvents()` returns an empty array. Verified movement and the final endpoint with empty, unavailable, and populated coalesced-event APIs in Chromium.
- [x] **Make feedback limits explicit and consistent.** Enforce 1,000 lines per design and 5,000 points per new line during drawing, with visible limit notices. Preserve older feedback above either limit in full when loading, saving, and exporting. Cover boundaries, continued drawing, undo/clear, and oversized legacy feedback with browser regression tests.
- [x] **Show persistence failures.** Display unsaved feedback and a retry action when browser storage is unavailable or full. Keep export available, including failed clears, retain unsaved marks across design switches, and clear the notice only after saving succeeds. Verify quota/security failures and recovery in browser tests.
- [x] **Recover from design errors.** Reject invalid or duplicate registrations with visible diagnostics, show an empty state when no designs are valid, and catch paint failures with a retry action. Preserve feedback for export and allow switching to a working design. Verify startup, registration, painting, and retry recovery in browser tests.
- [x] **Add focused browser regression checks.** Cover draw → resize → switch design → reload → export with measured SVG alignment, outside-board Shift lines, pointer cancellation, undo during a stroke, storage failures, and leaving with unsaved feedback. These checks pass locally in Chromium; a GitHub Actions workflow is configured for PRs and main updates.
- [ ] **Restore hosted browser test execution.** The first GitHub Actions run and its retry failed before a runner was assigned or any steps ran, with no job logs. Investigate repository/account runner availability and rerun the configured workflow; hosted test execution remains unverified. See [the initial run](https://github.com/PORTALSURFER/frame/actions/runs/36715797256).

## 2. Complete the human feedback loop

- [x] **Add explicit feedback modes.** Provide Pen, Note, and Select tools with active-state indicators, keyboard access, mode guidance, and safe text editing shortcuts.
- [x] **Add placed text annotations.** Click to place notes in design coordinates, edit/delete them in an editor, and move them by dragging or arrow keys. Save and export notes with strokes, retain legacy feedback, and verify alignment after resizing, design switching, and reload. Cover cancelled edits/drags and storage failures in browser tests.
- [x] **Allow individual mark selection and deletion.** Select a specific stroke or note and remove it with Delete selected or Delete/Backspace. Preserve unrelated marks, clear stale selection, return keyboard focus to the tool, and retain deletions across reload or failed saves. Verify text editing shortcuts remain untouched.
- [x] **Add redo and recoverable clear.** Keep the last 100 changes per design during the browser session for strokes, note creation/edits/moves, individual deletion, and clear. Preserve histories across design switches, reset them on reload, and save restored feedback. Verify undo/redo during drawing, exact recovery, redo replacement, text editing shortcuts, and failed-save recovery in Chromium.
- [x] **Define a versioned feedback schema.** Extend the current v2 stroke/note document with per-item IDs and types, design/revision IDs, timestamps, and optional element anchors. Notes already have stable IDs, text, and positional anchors; complete this metadata for all marks while preserving legacy feedback.
- [x] **Add feedback import and complete export.** Validate imported JSON and export strokes plus notes with their schema version and design context. Verify a round trip preserves all items and coordinates.
- [ ] **Add open/resolved status.** Let people and agents track which feedback still needs attention and reopen an item when needed.
- [ ] **Make feedback controls accessible.** Support keyboard navigation, visible focus, accessible tool names, and keyboard placement of notes. Check toolbar usability on small screens.

Milestone: a person can circle a control, attach a written request, export the feedback, and review the agent's revision with the original context intact.

## 3. Give AI structured design tools

- [x] **Add a styleguide picker.** Preserve the supplied Technical Futurist guide as the first entry, with per-design selection, a reference reader, color and typography/spacing/geometry tokens, an AI prompt, and full-guide download. Expose the registry and active guide to agents and pass it to paint scripts; verify persistence, registration errors, small-screen reading, and feedback preservation.

- [ ] **Define a design document model.** Represent screens and elements with stable IDs, bounds, hierarchy, text, styles, and component references. Keep a path for existing custom Canvas drawings.
- [ ] **Expose element inspection and hit testing.** List elements and inspect a region or ID; let feedback bind to an element while retaining a positional fallback.
- [ ] **Add reusable components and design tokens.** Provide layout, text, button, input, and container primitives with shared spacing, color, and typography values to reduce repeated drawing code.
- [ ] **Expose targeted editing operations.** Create, update, move, and remove elements with input validation and actionable errors; verify unrelated elements retain their IDs and properties.
- [ ] **Define an agent-facing API.** Support listing designs, selecting a screen/state, reading structure and feedback, applying edits, rendering previews, and exporting results. Document inputs, outputs, and examples before choosing an MCP or other transport.
- [ ] **Add predictable visual exports.** Export clean screenshots and screenshots with feedback, with explicit dimensions, scale, revision, and a render-ready signal after fonts and assets load.
- [ ] **Refresh designs without a full reload.** Preserve the selected design and feedback while an agent updates the design, and report failed updates visibly.

Milestone: an agent can inspect a marked element, change it through a documented operation, and obtain a screenshot of the result.

## 4. Add review and testing tools

- [ ] **Add zoom, pan, and fit controls.** Allow close inspection of large designs without changing their dimensions or annotation coordinates.
- [ ] **Support actual viewport-dependent layout.** Pass viewport dimensions into the layout/render process and add common size presets. Verify reflow rather than merely shrinking a fixed-size drawing.
- [ ] **Represent interface states.** Add named states such as default, loading, empty, error, hover, focus, and disabled where relevant to a design.
- [ ] **Separate interaction from annotation mode.** Let people and automated tools exercise prototype controls without drawing marks over them.
- [ ] **Add structural design checks.** Report text overflow, clipping, unintended overlaps, spacing inconsistencies, and contrast issues with element IDs and locations. Allow intentional exceptions.
- [ ] **Define accessibility testing limits.** Check actual semantics, focus order, and keyboard behavior in an interactive renderer; label Canvas-only results as visual checks rather than full accessibility validation.
- [ ] **Add repeatable visual and interaction tests.** Render selected viewports and states, compare against approved snapshots with tolerances, and report differences. Test prototype actions against expected state changes.

## 5. Preserve revision context and streamline handoff

- [ ] **Add identifiable design revisions.** Keep snapshots with revision IDs and associate each feedback item with the version a person reviewed.
- [ ] **Compare revisions.** Provide side-by-side or overlay views and a summary of changed elements.
- [ ] **Handle feedback after layout changes.** Carry element-bound notes forward when their target survives; flag removed targets or position-only notes for review instead of silently attaching them to a different control.
- [ ] **Export a portable project.** Bundle design data, assets, revisions, and feedback so work can move between browsers and agent sessions.
- [ ] **Add an end-to-end example and update documentation.** Demonstrate create → render → human annotation → agent edit → checks → review, and keep README feature claims aligned with shipped behavior.

## Recommended implementation order

Start with feedback reliability, placed notes, and the versioned feedback format. Next establish element identity and the agent API. Build review/testing and revision comparison on those foundations. Preserve the simple local workflow while these capabilities are added.
