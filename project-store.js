// Checkpoints publish a manifest and new revision bodies in one transaction.
(() => {
  const malformed = () => new Error('Unsupported or malformed saved project; original data is protected.');

  function create({name = 'frame-projects-v1', indexedDB} = {}) {
    let opening;
    function database() {
      if (opening) return opening;
      opening = new Promise((resolve, reject) => {
        const request = (indexedDB || window.indexedDB).open(name, 2);
        let abandoned = false;
        request.onupgradeneeded = event => {
          if (abandoned) { request.transaction.abort(); return; }
          if (event.oldVersion === 0) request.result.createObjectStore('projects', {keyPath: 'id'});
          request.result.createObjectStore('revisions');
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
          abandoned = true;
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
        const tx = db.transaction(['projects', 'revisions'], mode);
        let result, failure;
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(failure || tx.error || new Error('Project transaction aborted'));
        tx.onerror = () => {}; // onabort owns the final outcome.
        try { run(tx.objectStore('projects'), tx.objectStore('revisions'),
          value => { result = value; }, error => { failure = error; tx.abort(); }); }
        catch (error) { failure = error; tx.abort(); }
      });
    }
    function checked(record) {
      if (!record) return null;
      if (![1, 2].includes(record.version) || !Number.isSafeInteger(record.generation) || record.generation < 1 ||
          !Number.isFinite(Date.parse(record.updatedAt)) || record.id !== record.project?.archive?.designId) throw malformed();
      if (record.version === 1) {
        Frame.project.validate(record.project);
      } else {
        const archive = record.project.archive;
        if (!Array.isArray(archive.revisions) || !archive.revisions.some(revision => revision?.revisionId === archive.currentRevisionId) ||
            archive.revisions.some(revision => typeof revision?.document !== 'string' || !/^[a-f0-9]{64}$/.test(revision.document))) throw malformed();
      }
      return record;
    }

    // Schedule dependent IDB requests in the success callback to keep the
    // transaction active, including on engines that close it between tasks.
    function receive(request, next, fail) {
      request.onsuccess = () => {
        try { next(request.result); } catch (error) { fail(error); }
      };
    }

    function hydrate(record, revisions, done, fail) {
      record = checked(record);
      if (!record || record.version === 1) { done(record); return; }
      const entries = record.project.archive.revisions;
      const bodies = new Map();
      const keys = new Set(entries.map(entry => entry.document));
      for (const key of keys) {
        receive(revisions.get([record.id, key]), body => {
          if (typeof body !== 'string') throw malformed();
          bodies.set(key, body);
          if (bodies.size === keys.size) done({record, bodies});
        }, fail);
      }
    }

    function restoreProject(record, documentForKey) {
      const project = record.project;
      for (const entry of project.archive.revisions) entry.document = documentForKey(entry.document);
      if (record.assetsFromRevision === true) {
        const current = project.archive.revisions.find(entry => entry.revisionId === project.archive.currentRevisionId);
        if (!Array.isArray(current.document.assets)) throw malformed();
        project.assets = FrameDocument.clone(current.document.assets);
      }
      return Frame.project.validate(project);
    }

    async function materialize(value) {
      if (!value?.bodies) return value;
      const {record, bodies} = value;
      for (const [key, body] of bodies) if (await digest(body) !== key) throw malformed();
      // Keep the public checkpoint envelope stable for callers.
      const project = restoreProject(record, key => JSON.parse(bodies.get(key)));
      const {id, generation, updatedAt} = record;
      return {version: 1, id, generation, updatedAt, project};
    }

    return {
      read: id => transaction('readonly', (store, revisions, done, fail) => {
        receive(store.get(id), record => hydrate(record, revisions, done, fail), fail);
      }).then(materialize),
      list: async () => {
        const records = await transaction('readonly', (store, revisions, done, fail) => {
          receive(store.getAll(), records => {
            if (!records.length) { done([]); return; }
            const values = new Array(records.length);
            let remaining = records.length;
            records.forEach((record, index) => hydrate(record, revisions, value => {
              values[index] = value;
              if (--remaining === 0) done(values);
            }, fail));
          }, fail);
        });
        return Promise.all(records.map(async value => {
          const {id, generation, updatedAt, project} = await materialize(value);
          return {id, generation, updatedAt, revisionId: project.archive.currentRevisionId};
        }));
      },
      save: async (project, expectedGeneration) => {
        if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0) throw new Error('Expected project generation must be a nonnegative safe integer');
        if (expectedGeneration === Number.MAX_SAFE_INTEGER) throw new Error('Project generation limit reached');
        const snapshot = FrameDocument.clone(Frame.project.validate(project));
        const id = snapshot.archive.designId;
        const assetsFromRevision = Array.isArray(snapshot.assets) && snapshot.assets.length > 0;
        if (assetsFromRevision) delete snapshot.assets;
        const bodies = new Map();
        for (const entry of snapshot.archive.revisions) {
          const document = entry.document;
          const body = JSON.stringify(document);
          entry.document = await digest(body);
          bodies.set(entry.document, {body, document});
        }
        return transaction('readwrite', (store, revisions, done, fail) => {
          receive(store.get(id), value => {
            const previous = checked(value);
            if ((previous?.generation || 0) !== expectedGeneration) {
              const error = new Error('Project changed in another tab. Read and compare the saved project before retrying.');
              error.name = 'ConflictError';
              throw error;
            }
            const oldKeys = new Set(previous?.version === 2 ? previous.project.archive.revisions.map(entry => entry.document) : []);
            const keys = new Set([...oldKeys, ...bodies.keys()]);
            const oldDocuments = new Map();
            let remaining = keys.size;
            for (const key of keys) {
              receive(revisions.get([id, key]), saved => {
                const next = bodies.get(key);
                if (saved === undefined) {
                  if (oldKeys.has(key)) throw malformed();
                  revisions.add(next.body, [id, key]);
                } else if (typeof saved !== 'string' || (next && saved !== next.body)) {
                  throw malformed();
                }
                if (oldKeys.has(key)) oldDocuments.set(key, next?.document || JSON.parse(saved));
                if (--remaining === 0) {
                  if (previous?.version === 2) restoreProject(previous, key => oldDocuments.get(key));
                  const record = {version: 2, id, generation: expectedGeneration + 1, updatedAt: new Date().toISOString(), project: snapshot};
                  if (assetsFromRevision) record.assetsFromRevision = true;
                  store.put(record);
                  done({id, generation: record.generation, updatedAt: record.updatedAt});
                }
              }, fail);
            }
          }, fail);
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
