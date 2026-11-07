# Concept versions

Concept versions are parallel alternatives for one screen, visual state and viewport. Each alternative is an independent saved design, so its document revisions, annotations, undo history and storage conflicts stay isolated. A family manifest links those designs to their source and records an explicitly chosen version. Selecting a preview is separate from choosing a preferred version.

The manifest has `version: 1`, `designId` for the source design, and `groups`. Each group has an ID, a scope (`viewId`, `state`, `width`, `height`), named `versions` referencing saved `designId` identities, and a nullable `chosenId`. Version entries also have an ID and creation timestamp. A scope occurs once per family; saved alternative identities are unique across its groups. The source project remains intact.

Disk workspaces store manifests through `/__frame/concepts/<source-id>` using the existing expected-generation write contract. Browser-only workspaces use a separate IndexedDB store with the read/check/write in one transaction. Invalid records and stale writes fail without replacing existing data. Project and feedback formats remain unchanged.

A portable family envelope uses `format: "frame-concepts"`, `version: 1`, `family`, and `projects`. It contains the source plus every referenced alternative exactly once; each project still requires ordinary Frame project validation.
