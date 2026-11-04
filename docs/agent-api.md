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

`Frame.agent.reviewContext()` returns the selected design revision, viewport,
prototype state, view transform and structured annotations. Each annotation retains
its original mark metadata and geometry, its visible anchored target when present,
and up to ten overlapping geometry candidates with a total count. Geometry matches
always require review. Missing or hidden anchors and existing stale-mark warnings
remain explicit. Available historical source declarations are labeled separately
from current resolved bounds: old prototype state may be unknown. Calling this
method does not resolve or move marks. Custom Canvas designs have no element targets.

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
- renderReady(): await fonts and two animation frames.
- exportImage({designId?,feedback?,scale?}): PNG Blob and dimensions, scale, revision, and overlay flag. Select the design before exporting feedback. Scale is positive and at most 4; images above 64 million pixels are rejected.

Feedback placed on structured elements includes an element anchor with the element ID and a positional offset. Marks retain the revision they were created against when a document changes.

The Instrument workstation example is a serializable design with responsive bounds and state overrides. Documents are data; custom paint callbacks remain code and cannot be serialized into portable documents.

## Review and prototypes

Viewport presets and Frame.agent.setViewport(id,{width,height}) recompute responsive bounds rather than shrink a fixed canvas. Elements can specify percentage responsive bounds and maxWidth breakpoints. Frame.agent.setState(id,state) applies named overrides; controls use accessible labels and declarative set-state actions.

Choose Interact to exercise real button/input elements with mouse or keyboard. Other modes annotate feedback. Pan (H) drags the view; zoom controls and Fit preserve design coordinates. Frame.view exposes get, set({zoom,panX,panY}), fit, and setMode.

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
These operations are explicit checkpoints; automatic startup restoration and
feedback autosave are not connected to this store yet. Original localStorage
records remain intact. IndexedDB is origin-specific and quota-limited too; keep
portable exports. Failed writes retain the last committed snapshot and reject
the promise. Portable projects have a 128 MB UTF-8 limit. The loader also reads
the existing compressed/deduplicated browser archive encoding used by older
Frame sessions; it retains original bytes if loading or saving fails.

The Project menu offers Save checkpoint and Recover checkpoint. Recovery creates
a separately named design, preserving both the checkpoint and current work.
`await Frame.project.recoverDurable(savedId, unusedDesignId)` exposes the same
operation to agents and preserves all archived revisions under the new identity.

Frame.revisions.list(id), get(id,revisionId), restore(id,revisionId), and compare(id,before,after) preserve and inspect immutable snapshots. Comparisons list added/removed elements, changed fields, and document settings. Snapshot persistence failures remain recoverable through project download and Frame.revisions.retry().

Frame.project.export(id) returns a versioned project object with the complete archive, feedback, selected guide, viewport/state/input values, and embedded assets. Frame.project.validate(object) validates dependencies without changing registries. Frame.project.import(object) adds a new design atomically after validation and protects existing IDs and conflicting guide definitions. Select a design before exporting its feedback.

Marked element IDs and reviewed revisions persist through edits. Surviving bound marks move with their targets; missing/hidden targets and position-only feedback are marked needsReview with a reason. Restoring a snapshot can bring surviving anchors back into position. Review original geometry using the archived document and each mark's reviewedViewport.

Revision snapshots and projects describe structured designs; custom paint functions are code, not serializable project data. Visual comparison baselines remain in-session, while revision and feedback data are portable.
