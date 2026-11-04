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
      const controller=FrameAutomaticCheckpoints.create({
        capture:()=>Frame.project.export(id), read:()=>Frame.project.readDurable(id),
        canCapture:()=>id===current() && Frame.projectBridge.canCheckpoint(),
        write:(snapshot,generation)=>Frame.project.writeDurable(snapshot,generation),
        acknowledge:snapshot=>{
          Frame.projectBridge.acknowledgeCheckpoint(snapshot.feedback);
          Frame.revisions.acknowledgeCheckpoint(snapshot.archive);
        },
        notify:status=>notify(id,status)
      });
      controllers.set(id,controller);notify(id,controller.status());return controller.flush();
    },
    status:(id=current())=>controllers.get(id)?.status()||null,
    flush:(id=current())=>requireController(id).flush(),
    retry:(id=current())=>requireController(id).retry(),
    disable:(id=current())=>requireController(id).disable()
  };
  for(const event of ['frame:design-updated','frame:feedback-changed'])window.addEventListener(event,e=>controllers.get(e.detail.id)?.changed());
  window.addEventListener('frame:styleguide-selected',()=>controllers.get(current())?.changed());
  window.addEventListener('frame:design-leaving',e=>{const controller=controllers.get(e.detail.id);if(controller?.status().pending)controller.flush();});
  window.addEventListener('beforeunload',event=>{
    if([...controllers.values()].some(controller=>controller.status().pending)){event.preventDefault();event.returnValue='';}
  });
})();
