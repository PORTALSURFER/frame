// Independent manifests use generation-checked disk writes or one IndexedDB transaction.
(() => {
  let opening;
  function database() {
    if (!opening) opening = new Promise((resolve,reject) => {
      const request = indexedDB.open('frame-concepts-v1',1);
      request.onupgradeneeded = () => request.result.createObjectStore('families',{keyPath:'id'});
      request.onsuccess = () => {
        const db = request.result;db.onversionchange = () => {db.close();opening=null;};resolve(db);
      };
      request.onerror = () => {opening=null;reject(request.error);};
    });
    return opening;
  }
  function validateRecord(record,id) {
    if (record) {
      if (record.version !== 1 || record.id !== id || !Number.isSafeInteger(record.generation) || record.generation < 1) throw new Error('Unreadable concept family has been preserved');
      FrameConceptModel.validate(record.data,{id});
    }
    return record || null;
  }
  async function transaction(mode,run) {
    const db = await database();
    return new Promise((resolve,reject) => {
      const tx = db.transaction('families',mode);let result,failed;
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(failed || tx.error || new Error('Concept storage transaction failed'));
      run(tx.objectStore('families'),value => {result=value;},error => {failed=error;tx.abort();});
    });
  }
  Frame.conceptStore = {
    async read(id) {
      if (!FrameConceptModel.validId(id)) throw new Error('Invalid concept family identity');
      const record = Frame.disk ? await Frame.disk.read('concepts',id) : await transaction('readonly',(store,done) => {
        const request=store.get(id);request.onsuccess=()=>done(request.result);
      });
      return validateRecord(record,id);
    },
    async save(data,expected) {
      FrameConceptModel.validate(data);
      if (!Number.isSafeInteger(expected) || expected < 0 || expected === Number.MAX_SAFE_INTEGER) throw new Error('Invalid concept generation');
      if (Frame.disk) return Frame.disk.save('concepts',data.designId,expected,data);
      const snapshot=structuredClone(data);
      return transaction('readwrite',(store,done,fail) => {
        const request=store.get(snapshot.designId);
        request.onsuccess=()=>{
          try {
            const previous=validateRecord(request.result,snapshot.designId);
            if ((previous?.generation || 0) !== expected) {
              const error=new Error('Concept versions changed in another session. Refresh before retrying.');error.name='ConflictError';throw error;
            }
            const record={version:1,id:snapshot.designId,generation:expected+1,updatedAt:new Date().toISOString(),data:snapshot};
            store.put(record);done({id:record.id,generation:record.generation,updatedAt:record.updatedAt});
          } catch(error) {fail(error);}
        };
      });
    }
  };
})();
