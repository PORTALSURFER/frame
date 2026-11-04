// Only a verified, origin-local connection can resume source polling after startup.
(() => {
  const store = Frame.sourceStore.create(), statuses = new Map();
  const current = () => document.getElementById('design-picker').value;
  let epoch = 0, active = null;
  function conflict(message) { const error = new Error(message); error.name = 'ConflictError'; return error; }
  function sourceURL(url) {
    const source = new URL(url, location.href);
    if (source.origin !== location.origin || !['http:','https:'].includes(source.protocol) || source.username || source.password) throw new Error('Choose a same-origin HTTP source URL without credentials.');
    source.hash = ''; return source.href;
  }
  function report(id, state, error = null, settings = null) {
    const status = {designId:id, state, error, settings}; statuses.set(id,status);
    window.dispatchEvent(new CustomEvent('frame:source-session-status',{detail:status})); return status;
  }
  function begin(id) {
    epoch++;
    if(active){active.handle.stop();report(active.id,'paused','Source polling stopped in this tab. Reconnect to resume.');}
    active = null;
    return epoch;
  }
  function check(id, token) {
    if (token !== epoch || current() !== id) throw conflict('The selected review changed; reconnect the selected source.');
  }
  async function fingerprint(id) {
    const text = JSON.stringify(Frame.agent.getDocument(id));
    const digest = await Frame.project.startupEvidence.digest(text);
    if (JSON.stringify(Frame.agent.getDocument(id)) !== text) throw conflict('The design changed while checking its source. Reconnect after reviewing edits.');
    return digest;
  }
  function start(id, settings, generation, token, initialMatch) {
    const handle = Frame.agent.watchDocument({designId:id,url:settings.url,interval:settings.interval,requireInitialMatch:initialMatch,
      beforeApply:async() => {
        check(id,token);
        const saved = await store.read(id); check(id,token);
        if ((saved?.generation || 0) !== generation) throw conflict('Source settings changed in another tab. Reopen source settings.');
      },
      onApplied:async doc => {
        try {
          const digest = await fingerprint(id); check(id,token);
          if (Frame.agent.getDocument(id).revisionId !== doc.revisionId) throw conflict('Local edits interrupted the source update. Review before reconnecting.');
          const record = await store.save({...settings,id,enabled:true,revisionId:doc.revisionId,digest},generation,()=>{
            check(id,token);
            if(JSON.stringify(Frame.agent.getDocument(id))!==JSON.stringify(doc))throw conflict('Local edits interrupted saving source settings.');
          });
          generation = record.generation; settings = record;
        } catch (error) { throw conflict('Source connection could not be saved: '+error.message); }
      }
    });
    active = {id,handle,token}; return handle;
  }
  const api = Frame.sources = {
    status:(id=current()) => statuses.get(id) || {designId:id,state:'disconnected',error:null,settings:null},
    settings:(id=current()) => store.read(id),
    async connect({designId:id=current(),url,interval=1000}) {
      if (id !== current() || !Frame.documents.has(id)) throw new Error('Select a structured design before connecting a source.');
      const settings = {url:sourceURL(url),interval};
      if (!Number.isInteger(interval) || interval<250 || interval>60000) throw new Error('Interval must be 250 to 60,000 milliseconds.');
      const token = begin(id); report(id,'connecting');
      try {
        await Frame.project.startup.ready; check(id,token);
        const digest = await fingerprint(id), saved = await store.read(id); check(id,token);
        if (digest !== await fingerprint(id)) throw conflict('The design changed while connecting. Review edits before reconnecting.');
        check(id,token);
        return await start(id,settings,saved?.generation||0,token,true).poll();
      } catch (error) { if(token===epoch)report(id,error.name==='ConflictError'?'conflict':'error',error.message); throw error; }
    },
    async disconnect(id=current()) {
      const token = begin(id);
      try {
        const saved = await store.read(id); check(id,token);
        if (saved) await store.save({...saved,enabled:false},saved.generation,()=>check(id,token));
        check(id,token); return report(id,'disconnected',null,saved ? {...saved,enabled:false} : null);
      } catch (error) { if(token===epoch)report(id,'error','Source stopped in this tab, but disconnect was not saved; refresh may reconnect: '+error.message); throw error; }
    },
    poll:(id=current()) => active?.id===id ? active.handle.poll() : Promise.resolve(api.status(id))
  };
  async function resume() {
    const token = begin();
    const startup = await Frame.project.startup.ready;
    if (token !== epoch) return;
    const id = current();
    if (!Frame.documents.has(id)) return report(id,'disconnected');
    try {
      const saved = await store.read(id); check(id,token);
      if (!saved?.enabled) return report(id,'disconnected',null,saved);
      if (startup.designId===id && ['conflict','error'].includes(startup.state)) throw conflict('Checkpoint startup requires review; source reconnect is paused.');
      const url = sourceURL(saved.url), digest = await fingerprint(id); check(id,token);
      if (digest!==saved.digest || Frame.agent.getDocument(id).revisionId!==saved.revisionId) throw conflict('The open design differs from the last connected source. Current edits are preserved; compare before reconnecting.');
      if (!Frame.projectBridge.canCheckpoint() || document.querySelector('dialog[open]')) throw conflict('Finish the open gesture or dialog, then reconnect the source.');
      return await start(id,{...saved,url},saved.generation,token,false).poll();
    } catch (error) { if(token===epoch) return report(id,error.name==='ConflictError'?'conflict':'error',error.message); }
  }
  window.addEventListener('frame:watch-status',event => {
    const s=event.detail;
    if(active?.id===s.designId && active.token===epoch && s.state!=='stopped')report(s.designId,s.state,s.error,{url:s.url,revisionId:s.revisionId});
  });
  for(const event of ['frame:design-selected','frame:project-restored'])window.addEventListener(event,()=>{api.ready=resume();});
  api.ready=resume();
})();
