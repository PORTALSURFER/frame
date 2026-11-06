// A checkpoint may replace startup state only with unchanged legacy evidence and
// an untouched review. Divergence stays recoverable through Recover checkpoint.
(() => {
  const evidence=Frame.project.startupEvidence;
  const selected=()=>document.getElementById('design-picker').value;
  const initialSelection=selected();
  let id=evidence.rememberedId||initialSelection;
  const output=document.getElementById('startup-restore-status');
  let status={designId:id,state:'loading',reason:null};
  function report(state,reason=null){
    status={designId:id,state,reason};
    Frame.setProjectStatus(output,reason||(state==='restored'?'Restored checkpoint: '+id:''),!!reason);
    return {...status};
  }
  async function run(){
    try {
      let record=id?await Frame.project.readDurable(id):null;
      if(!record&&Frame.disk) {
        id=(await Frame.disk.list())[0]?.id||'';
        if(id)record=await Frame.project.readDurable(id);
      }
      if(!record){
        report('none');
        if(Frame.disk && selected()===initialSelection && Frame.documents.has(initialSelection) && Frame.projectBridge.canCheckpoint()) {
          await Frame.project.automaticCheckpoints.enable(initialSelection);
        }
        return {...status};
      }
      const resume=record.project.resume;
      if(!Frame.disk) {
        if(!resume?.legacyDigest)return report('conflict','Checkpoint needs review. Use Recover checkpoint; older or unavailable legacy evidence cannot be restored automatically.');
        const legacy=evidence.legacySnapshot(id), digest=await evidence.digest(legacy);
        if(digest!==resume.legacyDigest || evidence.legacySnapshot(id)!==legacy)return report('conflict','Legacy data and checkpoint differ. Both are preserved; use Recover checkpoint.');
      }
      if(Frame.projectBridge.restorationEpoch()!==0 || selected()!==initialSelection || !Frame.projectBridge.canCheckpoint() || Frame.project.automaticCheckpoints.status(id))return report('conflict','The review changed while loading. Current edits are preserved; use Recover checkpoint.');
      Frame.project.restoreStartup(record.project,initialSelection);
      report('restored');
      if(resume?.automaticCheckpoints){
        const saved=await Frame.project.automaticCheckpoints.enable(id);
        if(saved.error)return report('restored','Checkpoint restored; automatic saving requires review: '+saved.error);
      }
      return {...status};
    }catch(error){return report(error.name==='ConflictError'?'conflict':'error','Checkpoint not restored: '+error.message+' Original records remain available.');}
  }
  Frame.project.startup={status:()=>({...status}),ready:run()};
})();
