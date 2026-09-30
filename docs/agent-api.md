# Frame browser API

Use these methods through ordinary JavaScript or browser automation. No MCP transport is required. Mutations validate before applying; errors leave the current document intact.

A document is JSON with version 1, id, name, revisionId, positive integer width/height, and elements. Each element has a stable id, a type (container, text, button, input, line, chart), and bounds {x,y,width,height}. Optional parentId defines an acyclic hierarchy; child coordinates are relative to their parent. Text, styles, accessible labels, and component identity remain inspectable. Frame.components creates each primitive; Frame.tokens provides shared color, spacing, and typography defaults. Existing custom Canvas designs remain supported.

## Operations

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
