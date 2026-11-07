// Present acknowledged persistence state without changing the saving contracts.
(() => {
  const title = document.getElementById('workspace-title');
  const output = document.getElementById('workspace-save-state');
  const annotate = document.getElementById('mode-annotate');
  const activeTool = document.getElementById('active-tool');
  let annotationTool = 'pen';
  function refresh() {
    const id = document.getElementById('design-picker').value, design = Frame.designs.get(id);
    title.textContent = design?.name || 'No design open';
    title.title = design ? `${design.name} · ${id}` : '';
    if (!design) {output.textContent = '';return;}
    const feedback = Frame.feedback?.saveStatus();
    const checkpoint = Frame.project.automaticCheckpoints.status(id);
    const warning = document.querySelector('.project-statuses [data-warning]');
    const error = feedback?.error || checkpoint?.error || document.getElementById('project-save-notice').textContent || warning?.textContent;
    output.dataset.state = error ? 'error' : feedback?.pending || checkpoint?.pending ? 'pending' : 'saved';
    output.textContent = error ? 'Needs attention' : feedback?.pending ? 'Saving feedback…' : checkpoint?.pending ? 'Saving…' :
      Frame.project.hasUnsavedRevision(id) ? 'Unsaved changes' : Frame.disk ? checkpoint?.generation ? 'Saved locally' : 'Auto-save off' : 'Saved in browser';
    output.title = error || (Frame.disk ? 'Design checkpoints and feedback are stored in this local workspace.' : 'Stored at this browser address. Download a design for a portable backup.');
    if (output.textContent === 'Unsaved changes' || output.textContent === 'Auto-save off') output.dataset.state = 'unsaved';
  }
  function modeChanged(mode) {
    if (mode !== 'interact') annotationTool = mode;
    annotate.setAttribute('aria-pressed', String(mode !== 'interact'));
    activeTool.textContent = ({pen:'Pen',erase:'Eraser',note:'Note',pan:'Pan',select:'Select feedback',interact:'Prototype interaction'})[mode];
  }
  annotate.addEventListener('click', () => Frame.view.setMode(annotationTool));
  window.addEventListener('frame:feedback-mode', event => modeChanged(event.detail.mode));
  for (const event of ['frame:design-selected','frame:design-updated','frame:project-restored','frame:feedback-save-status','frame:automatic-checkpoint-status']) window.addEventListener(event, refresh);
  new MutationObserver(refresh).observe(document.querySelector('.project-statuses'), {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-warning']});
  refresh();
})();
