// A checkpoint may replace startup state only with unchanged legacy evidence and
// an untouched review. Divergence stays recoverable through Recover checkpoint.
(() => {
  const evidence=Frame.project.startupEvidence;
  const selected=()=>document.getElementById('design-picker').value;
  const initialSelection=selected(), id=evidence.rememberedId||initialSelection;
  const output=document.getElementById('startup-restore-status');
  let status={designId:id,state:'loading',reason:null};
  function report(state,reason=null){status={designId:id,state,reason};output.textContent=reason|| (state==='restored'?'Restored checkpoint: '+id:'');return {...status};}
  async function run(){
    try {
      const record=await Frame.project.readDurable(id);
      if(!record)return report('none');
      const resume=record.project.resume;
      if(!resume?.legacyDigest)return report('conflict','Checkpoint needs review. Use Recover checkpoint; older or unavailable legacy evidence cannot be restored automatically.');
      const legacy=evidence.legacySnapshot(id), digest=await evidence.digest(legacy);
      if(digest!==resume.legacyDigest || evidence.legacySnapshot(id)!==legacy)return report('conflict','Legacy data and checkpoint differ. Both are preserved; use Recover checkpoint.');
      if(Frame.projectBridge.restorationEpoch()!==0 || selected()!==initialSelection || !Frame.projectBridge.canCheckpoint() || Frame.project.automaticCheckpoints.status(id))return report('conflict','The review changed while loading. Current edits are preserved; use Recover checkpoint.');
      Frame.project.restoreStartup(record.project,initialSelection);
      report('restored');
      if(resume.automaticCheckpoints){
        const saved=await Frame.project.automaticCheckpoints.enable(id);
        if(saved.error)return report('restored','Checkpoint restored; automatic saving requires review: '+saved.error);
      }
      return {...status};
    }catch(error){return report(error.name==='ConflictError'?'conflict':'error','Checkpoint not restored: '+error.message+' Original records remain available.');}
  }
  Frame.project.startup={status:()=>({...status}),ready:run()};
})();
