// Follow the project's durable design head while keeping this tab's review context.
(() => {
  if (!Frame.disk) return;
  const output = document.getElementById('workspace-sync-status');
  const current = () => document.getElementById('design-picker').value;
  const observed = new Map();
  const checkpoints = Frame.project.automaticCheckpoints;
  let busy = false;

  async function poll() {
    if (busy || document.hidden) return;
    if (window.FrameDiskWorkspace) {
      busy = true;
      try {
        const workspace = await Frame.disk.workspace();
        if (workspace.id !== window.FrameDiskWorkspace.id) {
          const leaving = new Event('beforeunload', {cancelable:true});
          window.dispatchEvent(leaving);
          if (leaving.defaultPrevented || Frame.project.hasUnsavedRevision(current()) ||
              !Frame.projectBridge.canCheckpoint() || document.querySelector('dialog[open]')) {
            Frame.setProjectStatus(output, 'Workspace changed. Finish or save current edits to switch.', true);
          } else window.location.reload();
          return;
        }
      } catch (error) {
        Frame.setProjectStatus(output, 'Workspace updates are paused: ' + error.message, true);
        return;
      } finally { busy = false; }
    }
    const id = current();
    if (!Frame.documents.has(id)) return;
    const epoch = Frame.projectBridge.restorationEpoch();
    const ready = () => current() === id && Frame.projectBridge.restorationEpoch() === epoch &&
      !checkpoints.status(id)?.pending && !Frame.project.hasUnsavedRevision(id) &&
      Frame.projectBridge.canCheckpoint() && !document.querySelector('dialog[open]');
    if (!ready()) return;
    busy = true;
    try {
      const head = await Frame.project.readCheckpointHead(id);
      const last = observed.get(id);
      const known = Math.max(last?.generation || 0, checkpoints.status(id)?.generation || 0);
      if (!ready()) return;
      if (!head || head.generation <= known) {
        if (!last?.conflict) Frame.setProjectStatus(output, '');
        return;
      }
      const incoming = await Frame.project.readSavedRevision(id);
      if (!incoming || !ready()) return;
      const compatible = await Frame.project.savedDesignCanFollow(id, incoming.project);
      if (!ready()) return;
      if (!compatible) {
        observed.set(id, {generation:incoming.generation,conflict:true});
        Frame.setProjectStatus(output, 'The saved design differs from this review. Use Recover checkpoint to compare both versions.', true);
        return;
      }
      Frame.project.followSavedRevision(incoming.project);
      checkpoints.observe(id, incoming);
      observed.set(id, {generation:incoming.generation,conflict:false});
      Frame.setProjectStatus(output, '');
    } catch (error) {
      if (current() === id) Frame.setProjectStatus(output, 'Design updates are paused: ' + error.message, true);
    } finally { busy = false; }
  }
  Frame.project.startup.ready.then(() => {
    setInterval(poll, 1000);
    document.addEventListener('visibilitychange', poll);
  });
  window.addEventListener('frame:design-selected', () => Frame.setProjectStatus(output, ''));
})();
