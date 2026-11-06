// One acknowledged, bounded snapshot queue per enabled design. At most one write
// and one superseding snapshot are retained.
(function(root) {
  function create({capture, read, write, canCapture = () => true, acknowledge = () => {}, notify = () => {}, delay = 500,
    sameFeedback = (saved, current) => JSON.stringify(saved.feedback) === JSON.stringify(current.feedback),
    canRetryConflict, keepExisting = false}) {
    let enabled = true, version = 1, saved = 0, captured = 0, generation, queued, running, timer, ready;
    let error = null, capturing = false, initializing = true, baseline;
    function status() {
      return {enabled, generation, pending: saved < version || !!running || initializing || !!error,
        state: error ? (error.name === 'ConflictError' ? 'conflict' : 'error') : initializing ? 'loading' : running ? 'saving' : saved < version ? 'pending' : 'saved',
        error: error?.message || null};
    }
    function announce() { notify(status()); }
    function snapshot() {
      if (capturing || captured === version) return;
      if (!canCapture()) { clearTimeout(timer); timer = setTimeout(flush, delay); return; }
      capturing = true;
      try { queued = {project: capture(), version}; captured = version; }
      catch (failure) { error = failure; }
      finally { capturing = false; }
    }
    snapshot();
    const initial = queued?.project;
    function initialize() { initializing = true; return Promise.resolve().then(read).then(record => {
      // Enabling never replaces a divergent checkpoint left by another session.
      if (record && (!initial || record.project.archive.currentRevisionId !== initial.archive.currentRevisionId ||
          !sameFeedback(record.project, initial))) {
        const failure = new Error('Saved checkpoint differs from the open design. Recover it or explicitly save the current project before enabling automatic checkpoints.');
        failure.name = 'ConflictError'; throw failure;
      }
      generation = record?.generation || 0;
      baseline = record?.project;
      if (record && keepExisting && version === 1 &&
          record.project.resume?.automaticCheckpoints === initial.resume?.automaticCheckpoints &&
          JSON.stringify(record.project.archive.viewportPresets) === JSON.stringify(initial.archive.viewportPresets)) {
        saved = version;
        queued = null;
        acknowledge(initial);
      }
    }).catch(failure => { error = failure; }).finally(() => { initializing = false; announce(); }); }
    ready = initialize();
    async function writeBatch(batch) {
      try { return await write(batch.project, generation); }
      catch (failure) {
        if (failure.name !== 'ConflictError' || !canRetryConflict) throw failure;
        const record = await read();
        if (!record || !await canRetryConflict(record.project, batch.project, baseline)) throw failure;
        generation = record.generation;
        baseline = record.project;
        return write(batch.project, generation);
      }
    }
    function pump() {
      if (running) return running;
      if (initializing || error || !queued) return Promise.resolve();
      const batch = queued; queued = null;
      running = writeBatch(batch).then(receipt => {
        generation = receipt.generation; saved = batch.version; baseline = batch.project;
        acknowledge(batch.project);
      }).catch(failure => {
        error = failure;
        if (!queued) queued = batch;
      }).finally(() => {
        running = null; announce();
        if (queued && !error) return pump();
      });
      announce(); return running;
    }
    function flush() {
      clearTimeout(timer); snapshot();
      return ready.then(pump).then(status);
    }
    return {
      status, flush,
      observe(record) {
        if (status().pending || record.generation <= generation) return;
        generation = record.generation;
        baseline = record.project;
        announce();
      },
      changed() {
        if (!enabled || capturing) return;
        version++; clearTimeout(timer); announce();
        timer = setTimeout(flush, delay);
      },
      retry() {
        if (error?.name === 'ConflictError' && canRetryConflict && !initializing) {
          snapshot();
          const batch = queued;
          if (batch && canCapture()) {
            initializing = true;
            ready = Promise.resolve().then(read).then(async record => {
              if (!record || !await canRetryConflict(record.project, batch.project, baseline) ||
                  version !== batch.version || queued !== batch || !canCapture()) return;
              generation = record.generation;
              baseline = record.project;
              error = null;
            }).catch(failure => { error = failure; }).finally(() => { initializing = false; announce(); });
          }
        } else if (error?.name !== 'ConflictError') {
          error = null;
          if (generation === undefined) ready = initialize();
        }
        return flush();
      },
      disable() { enabled = false; return flush(); }
    };
  }
  const api = {create};
  if (typeof module !== 'undefined') module.exports = api;
  else root.FrameAutomaticCheckpoints = api;
})(typeof window === 'undefined' ? globalThis : window);
