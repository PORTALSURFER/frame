# Frame implementation todo

This backlog follows a source review of `README.md`, `frame.js`, `app.js`, `index.html`, `style.css`, and the example designs. Items below are proposed work, not implemented capabilities. Browser behavior has not yet been verified as part of this review.

## What we have

- A small browser app with no build step and two example designs.
- A `Frame.register` API for fixed-size designs painted with Canvas 2D.
- A design picker, automatic board scaling, and a red feedback brush.
- Freehand and Shift-constrained lines, undo, clear, per-design browser storage, and JSON feedback export.
- A README describing the AI-first product vision and current limitations.

The main gap is the feedback-to-revision loop. An agent can edit a drawing script, but Frame cannot yet identify the elements in that drawing, attach written feedback to them, or expose review and testing operations. Fitting a fixed canvas into a window also does not test a responsive layout.

## 1. Make existing feedback reliable

- [x] **Track the active pointer.** Ignore other pointers during a stroke and handle pointer cancellation and lost capture consistently. Verified in Chromium with mouse, touch, and pen input and cancellation/lost-capture regression checks.
- [x] **Make undo and clear safe during drawing.** Finish the active stroke before changing history and enable controls when drawing begins. Verified keyboard undo with and without previous feedback, both controls during drawing, continued drawing, and reload persistence in Chromium.
- [x] **Handle empty coalesced pointer events.** Fall back to the original event when `getCoalescedEvents()` returns an empty array. Verified movement and the final endpoint with empty, unavailable, and populated coalesced-event APIs in Chromium.
- [ ] **Make feedback limits explicit and consistent.** Loading currently truncates to 1,000 strokes and 5,000 points per stroke, while drawing and saving have no matching limit. Simplify strokes or enforce documented limits without silently losing saved feedback.
- [ ] **Show persistence failures.** When browser storage is unavailable or full, display that feedback is unsaved and keep export available.
- [ ] **Recover from design errors.** Show a useful empty state or render error instead of leaving an uncaught exception when registration or painting fails; allow switching to a working design.
- [ ] **Add focused browser regression checks.** Cover draw → resize → switch design → reload → export, pointer cancellation, undo during a stroke, and storage failures. Confirm coordinate alignment and retained feedback.

## 2. Complete the human feedback loop

- [ ] **Add explicit feedback modes.** Provide pen, note, and select tools with a visible active mode. Keep normal keyboard shortcuts working inside text inputs.
- [ ] **Add placed text annotations.** Click to place a note in design coordinates, then edit, move, or delete it. Keep its anchor aligned when the board resizes.
- [ ] **Allow individual mark selection and deletion.** Let a person remove a specific stroke or note without clearing all feedback.
- [ ] **Add redo and recoverable clear.** Keep a per-design history for strokes and notes; make clearing feedback undoable.
- [ ] **Define a versioned feedback schema.** Give each item an ID, type, design ID, revision ID, timestamp, and positional anchor. Include note text and an optional element ID; preserve existing stroke-only feedback through migration.
- [ ] **Add feedback import and complete export.** Validate imported JSON and export strokes plus notes with their schema version and design context. Verify a round trip preserves all items and coordinates.
- [ ] **Add open/resolved status.** Let people and agents track which feedback still needs attention and reopen an item when needed.
- [ ] **Make feedback controls accessible.** Support keyboard navigation, visible focus, accessible tool names, and keyboard placement of notes. Check toolbar usability on small screens.

Milestone: a person can circle a control, attach a written request, export the feedback, and review the agent's revision with the original context intact.

## 3. Give AI structured design tools

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
