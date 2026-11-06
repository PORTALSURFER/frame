(() => {
  if (!window.FrameDiskEnabled) return;
  const base = '/__frame/';
  const url = (kind, id) => base + kind + (id === undefined ? '' : '/' + encodeURIComponent(id));
  async function request(path, options = {}, {missing = false} = {}) {
    const response = await fetch(path, {cache: 'no-store', ...options});
    if (missing && response.status === 404) return null;
    if (!response.ok) {
      let data;
      try { data = await response.json(); } catch { /* HTTP status is still available */ }
      const error = new Error(data?.error || 'Frame disk storage returned HTTP ' + response.status);
      if (response.status === 409) error.name = 'ConflictError';
      throw error;
    }
    return response;
  }
  const put = body => ({method: 'PUT', headers: {'Content-Type': 'application/json'}, body});
  const read = async (kind, id) => (await request(url(kind, id), {}, {missing: true}))?.json() ?? null;
  const save = async (kind, id, expected, data) =>
    (await request(url(kind, id), put(JSON.stringify({expected, data})))).json();
  async function digest(text) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Revision documents are immutable. Cache only their identities, never their
  // serialized bodies, so subsequent checkpoints send metadata and new work.
  const uploaded = new WeakMap(), revisionKeys = new WeakMap();
  async function revisionKey(document) {
    if (revisionKeys.has(document)) return revisionKeys.get(document);
    const key = await digest(JSON.stringify(document));
    revisionKeys.set(document, key);
    return key;
  }
  async function ensureRevision(document) {
    if (uploaded.has(document)) return uploaded.get(document);
    const key = await revisionKey(document);
    const exists = await request(url('revisions', key), {method: 'HEAD'}, {missing: true});
    if (!exists) await request(url('revisions', key), put(JSON.stringify(document)));
    uploaded.set(document, key);
    return key;
  }
  async function getRevision(key) {
    const response = await request(url('revisions', key));
    const body = await response.text();
    if (await digest(body) !== key) throw new Error('Saved revision does not match its digest.');
    const document = JSON.parse(body);
    uploaded.set(document, key);
    revisionKeys.set(document, key);
    return document;
  }
  async function mapRevisions(entries, map) {
    const result = [];
    // Bound the number of large revision bodies alive in flight.
    for (let index = 0; index < entries.length; index += 2) {
      result.push(...await Promise.all(entries.slice(index, index + 2).map(map)));
    }
    return result;
  }
  Frame.disk = {
    read, save, digest,
    list: async () => (await request(url('projects'))).json(),
    async canRetryProject(saved, open) {
      const stored = saved.archive, current = open.archive;
      if (stored.designId !== current.designId) return false;
      const revisions = new Map(current.revisions.map(entry => [entry.revisionId, entry]));
      // A saved revision must be an ancestor of the open revision, not just an
      // item in its history. Retain every saved body, including other branches.
      const seen = new Set();
      let id = current.currentRevisionId;
      while (id && id !== stored.currentRevisionId && !seen.has(id)) {
        seen.add(id);
        id = revisions.get(id)?.parentRevisionId;
      }
      if (id !== stored.currentRevisionId) return false;
      for (const entry of stored.revisions) {
        const candidate = revisions.get(entry.revisionId);
        if (!candidate || (typeof entry.document === 'string' ? entry.document : await revisionKey(entry.document)) !== await revisionKey(candidate.document)) return false;
      }
      return true;
    },
    async readProject(id, knownRevisions = []) {
      const record = await read('projects', id);
      if (!record) return null;
      const project = record.data;
      const entries = project.archive.revisions;
      const known = new Map(await Promise.all(knownRevisions.map(async ({document})=>[await revisionKey(document),document])));
      project.archive.revisions = await mapRevisions(entries, async entry => ({
        ...entry, document: known.get(entry.document) || await getRevision(entry.document),
      }));
      if (record.data.assetsFromRevision) {
        const current = project.archive.revisions.find(entry => entry.revisionId === project.archive.currentRevisionId);
        project.assets = current.document.assets || [];
        delete project.assetsFromRevision;
      }
      Frame.project.validate(project, {portable: false});
      return {version: 1, id, generation: record.generation, updatedAt: record.updatedAt, project};
    },
    async saveProject(project, expected) {
      Frame.project.validate(project, {portable: false});
      const archive = project.archive;
      const revisions = await mapRevisions(archive.revisions, async entry => ({
        ...entry, document: await ensureRevision(entry.document),
      }));
      const data = {...project, archive: {...archive, revisions}};
      if (data.assets?.length) {
        data.assetsFromRevision = true;
        delete data.assets;
      }
      return save('projects', archive.designId, expected, data);
    },
  };
})();
