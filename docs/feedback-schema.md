# Feedback document version 3

Storage (frame-feedback-v3:<design-id>) and JSON downloads share one format:

~~~json
{
  "version": 3,
  "design": "starter",
  "revisionId": "r1",
  "width": 960,
  "height": 600,
  "lines": [{
    "id": "unique-mark-id",
    "type": "stroke",
    "designId": "starter",
    "revisionId": "r1",
    "createdAt": "2026-09-30T12:00:00.000Z",
    "updatedAt": "2026-09-30T12:00:01.000Z",
    "points": [[20, 30], [40, 50]],
    "elementAnchor": {"elementId": "save-button", "offset": [4, 8]}
  }],
  "notes": [{
    "id": "another-mark-id",
    "type": "note",
    "designId": "starter",
    "revisionId": "r1",
    "createdAt": "2026-09-30T12:01:00.000Z",
    "updatedAt": "2026-09-30T12:01:00.000Z",
    "text": "Move this control",
    "anchor": [40, 50]
  }]
}
~~~

All coordinates are finite pairs in design units, including positions outside the board.
Mark IDs are nonempty strings, unique across both collections. New IDs are UUIDs.
Dates are canonical ISO UTC strings; updated dates cannot precede creation.
Design scripts may register a nonempty revisionId. Unspecified revisions are null;
this is a reference identifier, not a stored revision snapshot.
Items retain their reviewed revision when the current design changes.

elementAnchor is optional. It contains a nonempty elementId and an optional
finite offset pair. Coordinates remain the fallback; element binding and
reconciliation are separate capabilities. New drawing does not infer an element.

The codec (FrameFeedback.read / validate) rejects malformed version 3 documents
as a whole, including duplicate IDs, wrong-design documents and unsupported versions.
Unreadable stored data is protected from replacement; new feedback can still be exported.

Version 2 stroke/note documents, version 1 arrays and the original Sift key remain
readable. Legacy stroke IDs are deterministic by design and index, with collision
avoidance; existing note IDs survive. Unknown historic dates and revisions remain
null, rather than being invented. Editing a legacy note sets its updated date.
Migration retains oversized feedback, writes only the version 3 key on the next
successful change/retry, and leaves older storage backups untouched.

Undo restores IDs, text, geometry and item timestamps exactly. Redo reuses the same
identity. Saving, exporting, resizing, changing tools and retrying storage do not
create mark identities or update item dates.

In disk-backed workspaces, Frame reconciles edits to different annotation IDs
when another session saves first. Conflicting changes to the same annotation
stay in the current tab and can be downloaded for review. Switching context or
viewport does not write feedback.

Feedback can include an optional `review` with `revisionId` (the proposed fix),
`summary` (1–2,000 characters), `proposedAt`, `decision` (`pending`, `accepted`,
`reopened`) and `decidedAt` (null while pending). Proposal and decision timestamps
are canonical ISO UTC. The original mark's `revisionId`, anchor and reviewed
viewport remain the annotation context. New structured marks also retain
`reviewedState`; historic unknown states remain unknown.

`Frame.feedback.propose(id, {revisionId, summary})` checks that the proposed
revision exists before changing the mark. Proposals remain open. `accept(id)`
records acceptance and resolves the mark; `reopen(id)` preserves the proposal and
records the decision to reopen it. These operations participate in ordinary
feedback undo/redo, saving, merging and portable export. They record review
intent, not authenticated reviewer identity. Existing `setStatus(id, 'resolved')`
never creates acceptance; resolving and accepting remain distinguishable.
