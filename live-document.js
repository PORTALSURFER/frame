// Opt-in source updates reuse the current design and preserve review UI state.
(() => {
  const watches = new Map();
  Frame.agent.watchDocument = ({designId, url, interval = 1000, requireInitialMatch = false, beforeApply, onApplied}) => {
    const source = new URL(url, location.href);
    if (source.origin !== location.origin || !['http:', 'https:'].includes(source.protocol) || source.username || source.password) throw new Error('Live documents require a same-origin HTTP URL without credentials');
    if (!Number.isInteger(interval) || interval < 250 || interval > 60000) throw new Error('Watch interval must be 250 to 60,000 milliseconds');
    let installed = Frame.agent.getDocument(designId).revisionId;
    watches.get(designId)?.stop();
    let stopped = false, timer, pending, etag, modified, previousText;
    const controller = new AbortController();
    const status = {designId, url: source.href, state: 'watching', revisionId: installed, error: null};
    function notify() {
      window.dispatchEvent(new CustomEvent('frame:watch-status', {detail: {...status}}));
    }
    function poll() {
      if (stopped) return Promise.resolve({...status});
      if (pending) return pending.then(() => ({...status}));
      clearTimeout(timer);
      pending = (async () => {
        try {
          const headers = {};
          if (etag) headers['If-None-Match'] = etag;
          else if (modified) headers['If-Modified-Since'] = modified;
          const response = await fetch(source, {cache: 'no-cache', headers, signal: controller.signal});
          if (stopped) return;
          if (response.status === 304) { status.state = 'watching'; status.error = null; return; }
          if (!response.ok) throw new Error('Source update failed: HTTP ' + response.status);
          if (Number(response.headers.get('content-length')) > 32 * 1024 * 1024) throw new Error('Source document exceeds 32 MB');
          const text = await response.text();
          if (stopped) return;
          if (text.length > 32 * 1024 * 1024) throw new Error('Source document exceeds 32 MB');
          if (text !== previousText) {
            if (document.querySelector('dialog[open]') || !Frame.projectBridge?.canCheckpoint()) {
              status.state = 'paused'; status.error = 'Finish the open dialog or gesture to resume source updates.'; return;
            }
            const doc = JSON.parse(text);
            if (doc.id !== designId) throw new Error('Source belongs to another design');
            FrameDocument.validate(doc);
            if (beforeApply) await beforeApply();
            if (stopped) return;
            if (Frame.agent.getDocument(designId).revisionId !== installed) {
              status.state = 'conflict';
              throw new Error('The open design has newer edits. Compare the source before restarting live updates.');
            }
            const same = JSON.stringify(doc) === JSON.stringify(Frame.agent.getDocument(designId));
            if (requireInitialMatch && previousText === undefined && !same) {
              status.state = 'conflict'; throw new Error('Source differs from the open design. Compare them before connecting.');
            }
            if (document.querySelector('dialog[open]') || !Frame.projectBridge?.canCheckpoint()) {
              status.state = 'paused'; status.error = 'Finish the open dialog or gesture to resume source updates.'; return;
            }
            if (!same) Frame.agent.updateDocument(doc);
            installed = doc.revisionId; status.revisionId = installed;
            if (onApplied) await onApplied(doc);
            if (stopped) return;
            previousText = text;
          }
          etag = response.headers.get('etag'); modified = response.headers.get('last-modified');
          status.state = 'watching'; status.error = null;
        } catch (error) {
          if (!stopped) { if (status.state !== 'conflict') status.state = error.name === 'ConflictError' ? 'conflict' : 'error'; status.error = error.message; }
        } finally {
          pending = null;
          if (!stopped) { notify(); if (status.state !== 'conflict') timer = setTimeout(poll, interval); }
        }
      })();
      return pending.then(() => ({...status}));
    }
    const handle = {poll, status: () => ({...status}), stop: () => {
      stopped = true; clearTimeout(timer); controller.abort(); status.state = 'stopped'; notify();
    }};
    watches.set(designId, handle); notify(); poll(); return handle;
  };
  Frame.agent.watchStatus = designId => watches.get(designId)?.status() || null;
})();
