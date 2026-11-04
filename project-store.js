// Durable portable-project snapshots. Transactions compare generations before writes;
// callers retain their in-memory document and exports when a write fails.
(() => {
  function create({name = 'frame-projects-v1', indexedDB} = {}) {
    let opening;
    function database() {
      if (opening) return opening;
      opening = new Promise((resolve, reject) => {
        const request = (indexedDB || window.indexedDB).open(name, 1);
        let abandoned = false;
        request.onupgradeneeded = () => request.result.createObjectStore('projects', {keyPath: 'id'});
        request.onerror = () => { opening = null; reject(request.error); };
        request.onblocked = () => {
          abandoned = true; opening = null;
          reject(new Error('Project storage upgrade is blocked. Close other Frame tabs and retry.'));
        };
        request.onsuccess = () => {
          const db = request.result;
          if (abandoned) { db.close(); return; }
          db.onversionchange = () => { db.close(); opening = null; };
          resolve(db);
        };
      });
      opening = opening.catch(error => { opening = null; throw error; });
      return opening;
    }
    async function transaction(mode, run) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('projects', mode);
        let result, failure;
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(failure || tx.error || new Error('Project transaction aborted'));
        tx.onerror = () => {}; // onabort owns the final outcome.
        try { run(tx.objectStore('projects'), value => { result = value; }, error => { failure = error; tx.abort(); }); }
        catch (error) { failure = error; tx.abort(); }
      });
    }
    function checked(record) {
      if (!record) return null;
      if (record.version !== 1 || !Number.isSafeInteger(record.generation) || record.generation < 1 ||
          !Number.isFinite(Date.parse(record.updatedAt)) || record.id !== record.project?.archive?.designId) throw new Error('Unsupported or malformed saved project; original data is protected.');
      Frame.project.validate(record.project);
      return record;
    }
    return {
      read: id => transaction('readonly', (store, done, fail) => {
        const request = store.get(id);
        request.onsuccess = () => { try { done(checked(request.result)); } catch (error) { fail(error); } };
      }),
      list: () => transaction('readonly', (store, done, fail) => {
        const request = store.getAll();
        request.onsuccess = () => {
          try { done(request.result.map(checked).map(({id, generation, updatedAt, project}) =>
            ({id, generation, updatedAt, revisionId: project.archive.currentRevisionId}))); }
          catch (error) { fail(error); }
        };
      }),
      save: (project, expectedGeneration) => {
        if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0) throw new Error('Expected project generation must be a nonnegative safe integer');
        const snapshot = FrameDocument.clone(Frame.project.validate(project));
        const id = snapshot.archive.designId;
        return transaction('readwrite', (store, done, fail) => {
          const request = store.get(id);
          request.onsuccess = () => {
            try {
              const previous = checked(request.result);
              if ((previous?.generation || 0) !== expectedGeneration) {
                const error = new Error('Project changed in another tab. Read and compare the saved project before retrying.');
                error.name = 'ConflictError'; throw error;
              }
              if (expectedGeneration === Number.MAX_SAFE_INTEGER) throw new Error('Project generation limit reached');
              const record = {version: 1, id, generation: expectedGeneration + 1, updatedAt: new Date().toISOString(), project: snapshot};
              store.put(record); done({id, generation: record.generation, updatedAt: record.updatedAt});
            } catch (error) { fail(error); }
          };
        });
      },
      close: async () => { if (opening) { const db = await opening; db.close(); opening = null; } }
    };
  }
  window.FrameProjectStore = {create};
  const store = create();
  const baselines = new WeakMap();
  let rememberedId = null;
  try { rememberedId = localStorage.getItem('frame-last-design'); } catch { /* startup remains conservative when storage is unavailable */ }
  function legacySnapshot(id) {
    const keys = ['frame-project-v1:'+id, 'frame-feedback-v3:'+id, 'frame-feedback-v2:'+id,
      'frame-feedback-v1:'+id, 'frame-styleguide:'+id, 'frame-last-design'];
    if (id === 'sift') keys.push('sift-ui-feedback-v1');
    return JSON.stringify(keys.map(key => [key, localStorage.getItem(key)]));
  }
  async function digest(value) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2,'0')).join('');
  }
  Frame.project.captureResume = project => {
    project.resume = {...project.resume,version:1, view:Frame.view?.get() || {zoom:1,panX:0,panY:0},
      automaticCheckpoints:!!Frame.project.automaticCheckpoints?.status(project.archive.designId)?.enabled};
    delete project.resume.legacyDigest;
    try { baselines.set(project, legacySnapshot(project.archive.designId)); } catch { baselines.set(project, null); }
  };
  async function write(project, expectedGeneration) {
    const snapshot = FrameDocument.clone(project), baseline = baselines.get(project);
    if (snapshot.resume) snapshot.resume.legacyDigest = typeof baseline === 'string' ? await digest(baseline) : null;
    return store.save(snapshot, expectedGeneration);
  }
  Frame.project.startupEvidence = {rememberedId, legacySnapshot, digest};
  Frame.project.saveDurable = (id, expectedGeneration) => write(Frame.project.export(id), expectedGeneration);
  Frame.project.writeDurable = write;
  Frame.project.readDurable = id => store.read(id);
  Frame.project.listDurable = () => store.list();
  Frame.project.recoverDurable = async (id, recoveredId) => {
    if (typeof recoveredId !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(recoveredId) || Frame.designs.has(recoveredId)) throw new Error('Choose a new, unused project ID');
    const record = await store.read(id);
    if (!record) throw new Error('Saved project not found');
    const project = FrameDocument.clone(record.project);
    project.archive.designId = recoveredId;
    for (const revision of project.archive.revisions) revision.document.id = recoveredId;
    project.feedback.design = recoveredId;
    for (const mark of [...project.feedback.lines, ...project.feedback.notes]) mark.designId = recoveredId;
    return Frame.project.import(project);
  };
})();
