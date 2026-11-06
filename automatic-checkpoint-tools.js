// Glue between selected-project snapshots, the save queue and the checkpoint UI.
(() => {
  const controllers = new Map();
  const current = () => document.getElementById('design-picker').value;
  function requireController(id) { const controller=controllers.get(id); if(!controller)throw new Error('Automatic checkpoints are not enabled for this design');return controller; }
  function notify(id, status) {
    window.dispatchEvent(new CustomEvent('frame:automatic-checkpoint-status', {detail: {designId:id,...status}}));
  }
  Frame.project.automaticCheckpoints = {
    enable(id=current()) {
      if (id!==current() || !Frame.documents.has(id)) throw new Error('Select a structured design before enabling automatic checkpoints');
      if (!Frame.projectBridge.canCheckpoint()) throw new Error('Finish editing feedback before enabling automatic checkpoints');
      const previous=controllers.get(id);
      if(previous?.status().enabled || (previous?.status().pending && !['error','conflict'].includes(previous.status().state)))return previous.flush();
      let controller;
      controller=FrameAutomaticCheckpoints.create({
        capture:()=>{const project=Frame.project.captureDurable(id);project.resume.automaticCheckpoints=controller?.status().enabled??true;return project;},
        read:()=>Frame.project.readCheckpointHead(id),
        ...(Frame.disk?{
          sameFeedback:()=>true,
          keepExisting:true,
          canRetryConflict:(saved,open,baseline)=>{
            const presets=project=>JSON.stringify(project?.archive.viewportPresets);
            return (presets(saved)===presets(open)||presets(saved)===presets(baseline))&&Frame.disk.canRetryProject(saved,open);
          }
        }:{}),
        canCapture:()=>id===current() && Frame.projectBridge.canCheckpoint(),
        write:(snapshot,generation)=>Frame.project.writeDurable(snapshot,generation),
        acknowledge:snapshot=>{
          if(!Frame.disk)Frame.projectBridge.acknowledgeCheckpoint(snapshot.feedback);
          Frame.revisions.acknowledgeCheckpoint(snapshot.archive);
        },
        notify:status=>notify(id,status)
      });
      controllers.set(id,controller);notify(id,controller.status());return controller.flush();
    },
    status:(id=current())=>controllers.get(id)?.status()||null,
    observe:(id,record)=>controllers.get(id)?.observe(record),
    async ensure(id=current()) {
      if (!Frame.documents.has(id) || id!==current()) return;
      const controller=controllers.get(id);
      return controller ? controller.retry() : Frame.project.automaticCheckpoints.enable(id);
    },
    flush:(id=current())=>requireController(id).flush(),
    save(id=current()) {
      const controller=requireController(id);
      controller.changed();
      return controller.flush();
    },
    retry:(id=current())=>requireController(id).retry(),
    disable:(id=current())=>{const controller=requireController(id);controller.changed();return controller.disable();}
  };
  const trackedEvents=Frame.disk?['frame:design-updated','frame:viewport-presets-changed']:['frame:design-updated','frame:feedback-changed'];
  for(const event of trackedEvents)window.addEventListener(event,e=>{
    if(Frame.restoringProject||e.detail.fromDisk||
       (Frame.disk&&event==='frame:design-updated'&&!e.detail.documentChanged))return;
    const controller=controllers.get(e.detail.id);
    if(controller)controller.changed();
    else if(Frame.disk && e.detail.id===current()) start(e.detail.id);
  });
  if(!Frame.disk)for(const event of ['frame:styleguide-selected','frame:view-changed'])window.addEventListener(event,()=>{
    if(!Frame.restoringProject)controllers.get(current())?.changed();
  });
  window.addEventListener('frame:design-leaving',e=>{const controller=controllers.get(e.detail.id);if(controller?.status().pending)controller.flush();});
  function start(id) {
    Frame.project.startup?.ready.then(status=>{
      if(id!==current() || controllers.has(id) || !Frame.documents.has(id) ||
          (status.designId===id && ['restored','conflict','error'].includes(status.state))) return;
      if(Frame.projectBridge.canCheckpoint()) return Frame.project.automaticCheckpoints.enable(id);
    }).catch(()=>{});
  }
  if(Frame.disk)window.addEventListener('frame:design-selected',e=>start(e.detail.design.id));
  window.addEventListener('beforeunload',event=>{
    if([...controllers.values()].some(controller=>controller.status().pending)){event.preventDefault();event.returnValue='';}
  });
})();
