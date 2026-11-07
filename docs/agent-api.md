# Frame browser API

Use these methods through ordinary JavaScript or browser automation. No MCP transport is required. Mutations validate before applying; errors leave the current document intact.

A document is JSON with version 1, id, name, revisionId, positive integer width/height, and up to 10,000 elements. Image elements reference assetId; assets embed PNG/JPEG/WebP data and render readiness waits for decoding. Each element has a stable id, a type (container, text, button, input, line, chart, image), and bounds {x,y,width,height}. Optional parentId defines an acyclic hierarchy; child coordinates are relative to their parent. Text, styles, accessible labels, and component identity remain inspectable. Frame.components creates each primitive; Frame.tokens provides shared color, spacing, and typography defaults. Existing custom Canvas designs remain supported.

## Operations

`Frame.agent.commit({requestId, designId, expectedRevisionId, operations})` applies
one atomic edit batch only while the expected revision is current. Stale edits
throw `ConflictError`. Exact retries return the original receipt; reusing a request
ID with changed content fails. The last 100 successful requests are retained in
the current page only. After reload or eviction an old expected revision still
prevents replay against a newer document. Receipts identify both revisions; await
`renderReady()` separately before visual verification. Use this operation for
concurrent agent workflows; the older mutation methods remain available.

`Frame.agent.watchDocument({designId, url, interval: 1000})` watches a same-origin
HTTP JSON document and applies new revisions to the existing design. It returns
`poll()`, `status()` and `stop()` methods. Updates preserve zoom/pan and compatible
prototype state; open dialogs pause updates. Local edits since the last installed
revision cause an explicit conflict and stop automatic polling. Compare the source
before restarting. HTTP validators reduce unchanged transfers; errors remain
visible and retry. Source files must use new revision IDs for changed content.
`Frame.agent.watchStatus(designId)` returns the current status without mutation.
This is opt-in; it does not reload application code or connect external file paths.

Use **Project → Source connection** to remember a source for the selected structured
design. The first connection requires a JSON document that exactly matches the open
document. Later revisions use the existing update path, retaining compatible state,
viewport, zoom/pan and feedback. Finish open dialogs and gestures before connecting.

`await Frame.sources.connect({designId?,url,interval:1000})` verifies and remembers
the connection; a first-source mismatch returns a conflict without installing it.
`settings(id?)` reads saved settings, `status(id?)` reports connection/error state,
`poll(id?)` refreshes the active source and `disconnect(id?)` stops polling and saves
the disabled preference. Omitted IDs select the current design. Settings use their
own IndexedDB store with generation checks; failed reads and stale writes preserve
existing records. A failed disconnect stays stopped in this tab but explicitly warns
that refresh may reconnect if disabling could not be saved.

`await Frame.sources.ready` waits for the selected source's reconnect attempt.
Reconnect waits for checkpoint startup and verifies the remembered revision and
SHA-256 document fingerprint. Divergent local edits, conflicting checkpoint startup,
unreadable settings or interrupted selection pause reconnect without replacing the
review. Only the selected design polls; selecting another design cancels pending
work and attempts that design's saved connection. Sources require same-origin HTTP
URLs without embedded credentials. Connections remain local to this browser origin:
portable imports/exports do not carry or start source connections. Application-code
updates still require serving the updated build and refreshing the same address.

The lower-level watcher also accepts `requireInitialMatch`, an asynchronous
`beforeApply()` guard, and `onApplied(document)` acknowledgement. Source sessions use
these hooks for verified admission and transactional settings. `ConflictError` from
either hook stops polling; other source errors remain visible and retry.

`Frame.agent.reviewContext()` returns the selected design revision, viewport,
prototype state, view transform and structured annotations. Each annotation retains
its original mark metadata and geometry, its visible anchored target when present,
and up to ten overlapping geometry candidates with a total count. Geometry matches
always require review. Missing or hidden anchors and existing stale-mark warnings
remain explicit. Available historical source declarations are labeled separately
from current resolved bounds: old prototype state may be unknown. Calling this
method does not resolve or move marks. Custom Canvas designs have no element targets.

`Frame.componentInstances.define(id, {id, elements, variants?})` defines a shared
component in a design. `instantiate(id, {id, componentId, x, y, variant?, overrides?})`
creates stable `instance--part` IDs. Variants and instance overrides are maps keyed
by local part ID; they may change text, style, bounds, visibility, disabled/value
state and points. Instance overrides win over variant and master values. Updating
a definition regenerates instances while preserving overrides and anchors; edits
that orphan state overrides or children are refused. `override(id, instanceId,
overrides)` replaces an instance's overrides. `publish(definition, designIds)`
validates all named designs before updating them. Libraries are embedded in
portable documents. Nested instances, arbitrary prototype behavior and automatic
native-code generation are not supported. Direct edits to generated parts are
replaced by regeneration; edit the definition or instance overrides instead.

- Frame.registerDocument(document): validate/register a document; duplicate IDs return false.
- Frame.agent.listDesigns(): IDs, sizes, revisions, and structured support.
- getDocument(designId): independent serializable copy.
- selectDesign(designId): select and paint a screen.
- inspect(designId, {elementId?,region?}): resolved hierarchy, styles, text, and bounds.
- hitTest(designId,x,y): visible matching elements, frontmost first.
- applyEdits(designId,operations): atomic create/update/remove batch with a new revision ID. Create uses {op:'create',element}; update uses {op:'update',id,patch}; remove uses {op:'remove',id} and removes descendants and their state overrides. IDs cannot change during update.
- updateDocument(document): refresh without reload; changed content needs a new revision ID.
- refreshDesign(designId,{paint?,name?,width?,height?,revisionId?}): refresh a custom Canvas design.
- getFeedback(): complete selected feedback, finishing gestures.
- renderReady(): await fonts, any deferred zoom repaint, and two animation frames.
- exportImage({designId?,feedback?,scale?}): PNG Blob and dimensions, scale, revision, and overlay flag. Select the design before exporting feedback. Scale is positive and at most 4; images above 64 million pixels are rejected.

Feedback placed on structured elements includes an element anchor with the element ID and a positional offset. Marks retain the revision they were created against when a document changes.

The Instrument workstation example is a serializable design with responsive bounds and state overrides. Documents are data; custom paint callbacks remain code and cannot be serialized into portable documents.

## Review and prototypes

Containers may opt into `flow: {kind: "row" | "column" | "wrap" | "grid", gap?,
columns?}`. Children retain declared or responsive sizes; flow determines their
positions. Grid requires a column count; wrapping starts a new row when necessary.
Hidden children do not occupy slots. `flowGrow` shares remaining main-axis space
among row/column children with zero growth basis. Gaps may name a nonnegative
`document.tokens.spacing` entry. Layout is shared by rendering, hit testing and
inspection. This model does not yet implement general flex shrink, min/max bounds,
alignment, scrolling, text measurement or nested component instances.

Review scenarios start independently from the initial viewport and input values.
Hidden or disabled controls cannot be activated through scenario actions. Results
include revision, viewport and the declarative interaction model so they remain
attributable to their tested context. A passing action/state result does not imply
the structural checks are clean or that native product behavior is implemented.

Viewport presets and Frame.agent.setViewport(id,{width,height}) recompute responsive bounds rather than shrink a fixed canvas. Elements can specify percentage responsive bounds and maxWidth breakpoints. Frame.agent.setState(id,state) applies named overrides; controls use accessible labels and declarative set-state actions.

Every structured design has a **Design size** preview using its own `width` and
`height`. That option follows dimension changes in later revisions. A preview at
the previous design size follows the new size automatically. Other selected
preview dimensions are preserved, including when switching designs.

A document may declare `viewportPresets: [{name: "Expanded", width: 1100,
height: 200}]` for its own named preview sizes. Dimensions are whole numbers from
1 to 8192, with up to 16 unique names and resolutions. Without a declaration,
Frame offers the design's own size. The **Designs → Viewport sizes** dialog and
`Frame.project.setViewportPresets(id, presets)` save overrides for that project.
`Frame.project.getViewportPresets(id)` returns those overrides or the document's
defaults. Design size stays available alongside the configured presets. Saved
projects retain their existing presets and selected viewport.

Use `views` to organize a design's screens and the contexts available within each screen:

```json
{
  "views": [
    {
      "id": "issues",
      "label": "Issues",
      "contexts": [
        {"id": "default", "label": "Browse", "overrides": {}},
        {"id": "issues-selected", "label": "Selected rows", "overrides": {"selection-bar": {"visible": true}}}
      ]
    }
  ]
}
```

Each view has a unique ID and at least one context. Context IDs are unique across the design, and one must be `default`. These IDs work with `setState`, prototype actions, checkpoints, and the `viewportLayouts.narrow` and `viewportLayouts.wide` lists. A view opens in its first available context. If a viewport change makes the current context unavailable, Frame tries the first available context in the same view, then falls back to `default`. Switching back to the original viewport restores the requested context if it is still selected. Documents with a flat `states` map still use the original state picker.

For distinct narrow and wide compositions in a single design, declare `viewportLayouts: {maxWidth, narrow, wide}`. Each layout lists its available states, including `default`. Elements with `viewportLayout: "narrow"` appear at or below `maxWidth`. Elements with `viewportLayout: "wide"` appear above it. Descendants inherit visibility from their parents. Frame previews the default state when the current state is unavailable at a width. Feedback stays with the layout in which it was recorded.

Choose Interact to exercise real button/input elements with mouse or keyboard. Other modes annotate feedback. Pan (H) drags the view; zoom controls and Fit preserve design coordinates. Frame.view exposes get, set({zoom,panX,panY}), fit, and setMode.

Wheel and toolbar zoom update geometry and view-change events immediately, then
repaint the sharp canvas after 350 ms without another zoom event. The existing
raster remains visible during the burst. `renderReady()` and PNG export wait for
that repaint. Explicit `Frame.view.set()` still resizes the raster immediately.
Canvas backing storage stays within 8192 pixels per axis and 16,777,216 pixels
overall. Changing designs or returning to the existing resolution cancels stale
zoom work without leaving readiness pending.

Frame.review.check(id) reports text overflow, clipping, unexpected overlaps, spacingGroup inconsistencies, and contrast with element IDs. Element exceptions list check types or overlap:other-id; allowOverlapWith names intentionally overlapping elements. Checks describe declared bounds and Canvas text; custom Canvas-only screens cannot provide structural or semantic assertions.

Frame.review.checkAccessibility() checks actual interactive controls' names, focusability, and order only while Interact is active. It explicitly reports unverified otherwise; screen reader behavior and complete WCAG conformance need separate testing.

Frame.review.approve(id,name) records an in-session raster baseline for a viewport/state. compare(id,{name,channelTolerance,maxChangedRatio}) returns changed pixels and a tolerance verdict. Missing baselines are errors, not passes. Frame.review.run(id,scenarios) tests declared click/input actions across viewport/state cases and expectedState; it restores the initial view, state, and input values afterward. These checks can be called from Playwright or the browser console.

## Revisions and handoff

`await Frame.project.saveDurable(designId, expectedGeneration)` stores a complete
portable project, including history and feedback, in IndexedDB. Use generation
zero only for an absent record. A successful transaction returns the next generation;
stale writers receive `ConflictError` and must read and compare before retrying.
`await Frame.project.readDurable(id)` returns the saved record (or null), and
`await Frame.project.listDurable()` lists saved project identities and generations.
The returned project can be validated and imported through the existing portable
project API. Saving requires the design to be selected so its feedback is included.
These operations also serve automatic checkpoint queues. Original localStorage
records remain intact during restoration. IndexedDB is origin-specific and quota-limited too; keep
portable exports. Failed writes retain the last committed snapshot and reject
the promise. Portable projects have a 128 MB UTF-8 limit. The loader also reads
the existing compressed/deduplicated browser archive encoding used by older
Frame sessions; it retains original bytes if loading or saving fails.

Incremental checkpoints store revision documents by content within each project.
A feedback or view change writes the checkpoint manifest alone. A design edit
adds its new revision document in the same transaction. The first successful
save of a legacy checkpoint converts it to this format. Opening the upgraded
IndexedDB database requires the updated Frame build. Portable exports keep their
existing format.

The Project menu offers Save checkpoint and Recover checkpoint. Recovery creates
a separately named design, preserving both the checkpoint and current work.
`await Frame.project.recoverDurable(savedId, unusedDesignId)` exposes the same
operation to agents and preserves all archived revisions under the new identity.

Automatic checkpoints are an opt-in Project-menu setting for each design in the
current tab. They coalesce changes for 500 ms, serialize writes and retain one
superseding snapshot. Feedback, document, prototype state/input, viewport and
styleguide changes are included. Switching designs captures pending work before
selection changes. Save status remains pending until the captured snapshot is
committed; an older receipt cannot acknowledge newer edits. Failed writes require
Retry automatic checkpoint. Conflicts preserve the saved version and require
comparison/recovery rather than an automatic overwrite.

`Frame.project.automaticCheckpoints` provides `enable(id)`, `status(id)`, `flush(id)`,
`retry(id)` and `disable(id)`; omitted IDs select the current design. Disabling
captures pending changes for a final write. Unsaved work in any enabled or disabled
queue still protects page unload. A successful matching checkpoint acknowledges
the corresponding feedback/archive browser-save warning without rewriting protected
legacy records. Enabling refuses a divergent existing checkpoint. Recover that
checkpoint or explicitly compare/save the current project first.

New checkpoints include optional version-1 `resume` metadata: pan/zoom, the
automatic-checkpoint preference and a SHA-256 digest of legacy records observed
when that snapshot was captured. Exported JSON exposes no raw legacy records;
durable writes add the digest from a private capture-time baseline. Exports copied
outside the capture path may lack that proof and still support explicit recovery.

At startup, `await Frame.project.startup.ready` returns `none`, `restored`,
`conflict` or `error`; `startup.status()` reports the same outcome. The remembered
project may be restored even if it was created at runtime and has no source script.
Matching checkpoints restore history, feedback, viewport/state/inputs/styleguide,
pan/zoom and the automatic-saving preference. Legacy records must still match
their capture-time digest, source revisions and shared immutable revisions must
agree, and the active review must be untouched. Active gestures and edits during
the asynchronous read prevent replacement. Installation suppresses normal carry
and persistence handlers and emits one `frame:project-restored` event afterward.

Older checkpoints without proof, divergent records and malformed data are retained
for explicit Recover checkpoint review. Startup does not rewrite their legacy keys.
Cross-origin migration and incremental history storage remain separate work.

Frame.revisions.list(id), get(id,revisionId), restore(id,revisionId), and compare(id,before,after) preserve and inspect immutable snapshots. Comparisons list added/removed elements, changed fields, and document settings. Snapshot persistence failures remain recoverable through project download and Frame.revisions.retry().

Frame.project.export(id) returns a versioned project object with the complete archive, feedback, selected guide, viewport/state/input values, and embedded assets. Frame.project.validate(object) validates dependencies without changing registries. Frame.project.import(object) adds a new design atomically after validation and protects existing IDs and conflicting guide definitions. Select a design before exporting its feedback.

For explicit transfer between addresses, export a portable project at the source,
then choose Import project at the destination. Preview shows a separate project
ID, history/feedback/asset counts and any styleguide copy. Editing the destination
invalidates confirmation until previewed again. Existing live designs, legacy
records and durable checkpoints cannot be overwritten by this workflow.

`await Frame.project.prepareTransfer(input, {designId?})` validates and prepares a
copy without changing registries. A conflicting source ID gets an `-imported`
proposal; occupied proposals require another ID. Conflicting guides use the new
project ID plus `-guide`. Known design/feedback/guide references are remapped;
opaque extension data, archived revisions and asset bytes are retained. Source
startup provenance is removed because it cannot authorize another origin.

`await Frame.project.transfer(prepared.project)` rechecks destination occupancy,
reserves a durable checkpoint at generation zero, then installs the copy without
writing project/feedback legacy records. Explicit selection changes the last-design
preference. A second durable write records destination resume evidence, and the
saved automatic-checkpoint preference is applied. A receipt identifies the saved
generation and `opened`/`resumeReady` status. Failure before publication throws
without registering a design; later failure returns a saved recovery receipt and
error rather than deleting the checkpoint. Unknown project/resume extension fields
survive later exports and automatic checkpoints. Cross-origin access is never
scraped or inferred; the source file and origin remain unchanged.

Marked element IDs and reviewed revisions persist through edits. Surviving bound marks move with their targets; missing/hidden targets and position-only feedback are marked needsReview with a reason. Restoring a snapshot can bring surviving anchors back into position. Review original geometry using the archived document and each mark's reviewedViewport.

Revision snapshots and projects describe structured designs; custom paint functions are code, not serializable project data. Visual comparison baselines remain in-session, while revision and feedback data are portable.

Revision titles can be supplied as `document.metadata.revisionTitle` on a new immutable document revision. Existing snapshots receive readable labels from their element changes. `Frame.revisionReview.open(designId, {beforeRevisionId?, afterRevisionId?, viewport?, state?})` opens a detached comparison without restoring snapshots or changing the live review. Titles are labels; exact revision IDs remain the identity.

Use `Frame.feedback.propose(markId, {revisionId, summary})` after making a targeted
revision. This records a pending proposal and retains the original review context.
The reviewer can accept or reopen it. `Frame.feedback.accept(markId)` and
`Frame.feedback.reopen(markId)` record those decisions with undo and persistence;
they do not authenticate the caller as a human. Legacy resolution is never treated
as acceptance. A new proposal clears an earlier decision and needs review again.

## Implementation handoff

Choose **Inspect** and click an element, or open **Designs → Inspect & handoff**
for keyboard selection. Inspection exposes resolved bounds/styles, stable IDs,
component definition and instance identity, and prototype behavior. It never edits
the document or annotations.

For the selected design, `Frame.handoff.report(id)` returns a versioned
`frame-implementation-handoff` with exact revision, viewport, state, input values,
resolved elements, layout declarations, screens/states, shared tokens, component
library, embedded assets, feedback and acceptance checks. `inspect(id, elementId)`
returns one element. `export(id, {format: 'json' | 'markdown'})` returns portable
JSON with assets or a concise Markdown brief. Exports are deterministic for the
same document and review context; they do not save, resolve feedback or certify
application behavior.

An element is `illustrated` unless it has a Frame input or declared state
transition (`frame-interactive`). Optional `document.metadata.runtimeEvidence`
records reported external checks. Each record requires `elementId`, `revisionId`,
`state`, `viewport: {width,height}`, `result: 'passed' | 'failed'`, canonical ISO
`checkedAt`, and nonempty `platform`, `applicationVersion`, `source` and `reference`.
Only the latest check matching this exact revision, element, state and viewport
can yield `runtime-verified`, and only when it passed. A later matching failure
supersedes a pass. Other checks remain listed with their original context.
Frame validates record shape; it does not authenticate the report or execute the
external check. Omit evidence until the target application was actually checked.
