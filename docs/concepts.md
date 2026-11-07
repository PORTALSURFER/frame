# Concept versions

Concept versions are parallel alternatives for one screen, visual state and viewport. Each alternative is an independent saved design, so its document revisions, annotations, undo history and storage conflicts stay isolated. A family manifest links those designs to their source and records an explicitly chosen version. Selecting a preview is separate from choosing a preferred version.

The manifest has `version: 1`, `designId` for the source design, and `groups`. Each group has an ID, a scope (`viewId`, `state`, `width`, `height`), named `versions` referencing saved `designId` identities, and a nullable `chosenId`. Version entries also have an ID and creation timestamp. A scope occurs once per family; saved alternative identities are unique across its groups. The source project remains intact.

Disk workspaces store manifests through `/__frame/concepts/<source-id>` using the existing expected-generation write contract. Browser-only workspaces use a separate IndexedDB store with the read/check/write in one transaction. Invalid records and stale writes fail without replacing existing data. Project and feedback formats remain unchanged.

A portable family envelope uses `format: "frame-concepts"`, `version: 1`, `family`, and `projects`. It contains the source plus every referenced alternative exactly once; each project still requires ordinary Frame project validation.

## Review workflow

Choose a viewport, screen and state, then use **+** beside Version to clone a named alternative. The first creation also saves an Original copy; the source design remains intact. Switch with the Version selector, including keyboard and hover-plus-arrow navigation. Each saved version has its own annotations and revision history. **Use this version** records preference without deleting the others.

Changing viewport, screen or state returns to the source design and opens the preferred version for that comparison when one exists. Designs contains Rename version, Download all versions, Import versions and the design-guide controls. Use the family download to move a complete comparison, including its source, all alternatives, preference and feedback.

## Agent API

`Frame.agent.concepts.context()` returns the current root design and comparison scope. `family()` asynchronously reads its manifest. `create({name, document?})` copies the selected concept or accepts a validated structured document; it returns the new version's ID and saved design identity. New versions start with empty feedback. The Original copy retains the source annotations and the historical snapshots those annotations reference.

`select(versionId)` opens an alternative with the same comparison context and canvas transform. Edit it through the existing revision-checked agent tools; further edits remain that version's own revision history. `choose(versionId)` records a preferred alternative. `rename(versionId, name)` changes its menu label. `navigate({viewId?, state?, width?, height?})` changes comparison scope through the source design.

`review()` returns every version's current document and independent feedback for the current comparison, including the chosen version ID. `reviewAll()` does this for every comparison in the family. These reads preserve the user's selected version and canvas view. Feedback retains its existing element anchors, reviewed revision, state and viewport. Agents can use those records to synthesize another alternative with `create`; synthesis is an agent design decision, not an automatic image blend.

`export()` returns a validated family envelope. `import(bundle, {rootId?})` validates all projects, assigns unused identities and reserves saved copies before publishing a manifest. It preserves existing projects; failed reservations remain recoverable through Browse designs. Disk conflicts and unavailable storage are reported rather than silently replacing a family.
