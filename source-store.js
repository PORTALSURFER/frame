// Small origin-local source settings, separate from portable project data.
(() => {
  function validate(record) {
    if (!record) return null;
    if (record.version !== 1 || typeof record.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(record.id) ||
        !Number.isSafeInteger(record.generation) || record.generation < 1 || typeof record.enabled !== 'boolean' ||
        typeof record.url !== 'string' || record.url.length > 4096 || typeof record.revisionId !== 'string' ||
        !/^[a-f0-9]{64}$/.test(record.digest) || !Number.isInteger(record.interval) || record.interval < 250 || record.interval > 60000) {
      throw new Error('Invalid source settings; original settings are preserved.');
    }
    return record;
  }
  function create({name = 'frame-source-sessions-v1'} = {}) {
    let opening;
    function database() {
      if (opening) return opening;
      opening = new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1); let abandoned = false;
        request.onupgradeneeded = () => request.result.createObjectStore('sources', {keyPath:'id'});
        request.onerror = () => reject(request.error);
        request.onblocked = () => { abandoned = true; reject(new Error('Source settings storage is blocked. Close other Frame tabs and retry.')); };
        request.onsuccess = () => {
          const db = request.result;
          if (abandoned) { db.close(); return; }
          db.onversionchange = () => { db.close(); opening = null; }; resolve(db);
        };
      }).catch(error => { opening = null; throw error; });
      return opening;
    }
    async function run(id, next, expectedGeneration, guard) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sources', next ? 'readwrite' : 'readonly'), store = tx.objectStore('sources');
        let result, failure;
        tx.oncomplete = () => resolve(result); tx.onerror = () => {};
        tx.onabort = () => reject(failure || tx.error || new Error('Source settings transaction failed'));
        const request = store.get(id);
        request.onsuccess = () => {
          try {
            const old = validate(request.result);
            if (!next) { result = old; return; }
            if ((old?.generation || 0) !== expectedGeneration) {
              const error = new Error('Source settings changed in another tab. Reopen source settings before reconnecting.');
              error.name = 'ConflictError'; throw error;
            }
            guard?.();
            result = validate({...next, id, version:1, generation:expectedGeneration + 1}); store.put(result);
          } catch (error) { failure = error; tx.abort(); }
        };
      });
    }
    return {read:id => run(id), save:(record, generation, guard) => {
      if (!Number.isSafeInteger(generation) || generation < 0 || generation === Number.MAX_SAFE_INTEGER) throw new Error('Invalid source generation');
      return run(record.id, structuredClone(record), generation, guard);
    }};
  }
  function diskStore() {
    const unpack = record => record ? validate({...record.data, generation: record.generation}) : null;
    async function read(id) {
      return unpack(await Frame.disk.read('sources', id));
    }
    async function save(record, generation, guard) {
      const data = validate({...record, version: 1, generation: generation + 1});
      guard?.();
      const receipt = await Frame.disk.save('sources', data.id, generation, data);
      return {...data, generation: receipt.generation};
    }
    return {read, save};
  }
  Frame.sourceStore = {create: options => {
    const legacy = create(options);
    return Frame.disk ? diskStore() : legacy;
  }};
})();
