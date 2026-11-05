// Explicit checkpoints; original legacy records and recovery sources are retained.
(() => {
  const showStatus = Frame.setProjectStatus = (output, message, warning = false) => {
    if (output.textContent !== message) output.textContent = message;
    output.toggleAttribute('data-warning', warning);
  };
  const save=document.getElementById('save-checkpoint'), dialog=document.getElementById('checkpoint-dialog');
  const choices=document.getElementById('checkpoint-picker'), name=document.getElementById('checkpoint-new-id');
  const status=document.getElementById('checkpoint-status'), recovery=document.getElementById('checkpoint-recovery-status');
  const confirm=document.getElementById('confirm-checkpoint-recovery'), generations=new Map();
  let request=0, saving=false, recovering=false;
  const current=()=>document.getElementById('design-picker').value;
  async function refresh(){
    const token=++request,id=current();save.disabled=true;
    if(!Frame.documents.has(id))return;
    try{const record=await Frame.project.readDurable(id);if(token!==request)return;
      generations.set(id,Frame.project.automaticCheckpoints?.status(id)?.generation??record?.generation??0);save.disabled=saving;
    }catch(error){if(token===request)showStatus(status,'Checkpoint storage unavailable: '+error.message,true);}
  }
  save.addEventListener('click',async()=>{
    const id=current();if(saving||!generations.has(id))return;saving=true;save.disabled=true;
    try{const automatic=Frame.project.automaticCheckpoints;
      const receipt=automatic?.status(id)?.enabled?await automatic.flush(id):await Frame.project.saveDurable(id,generations.get(id));
      if(receipt.error)throw new Error(receipt.error);generations.set(id,receipt.generation);
      showStatus(status,'Checkpoint saved: '+id+' · generation '+receipt.generation);
    }catch(error){showStatus(status,'Checkpoint not saved: '+error.message+' Download the project to keep a portable backup.',true);}
    finally{saving=false;save.disabled=!Frame.documents.has(current())||!generations.has(current());}
  });
  document.getElementById('recover-checkpoint').addEventListener('click',async()=>{
    choices.replaceChildren();confirm.disabled=true;dialog.showModal();
    try{const records=await Frame.project.listDurable();if(!dialog.open)return;
      for(const record of records){const option=document.createElement('option');option.value=record.id;option.textContent=record.id+' · '+record.revisionId+' · generation '+record.generation;choices.append(option);}
      name.value=records.length?records[0].id+'-recovered':'';confirm.disabled=!records.length;
      recovery.textContent=records.length?'Recovery creates a separate design and preserves the saved checkpoint.':'No durable checkpoints saved at this address.';
    }catch(error){recovery.textContent=error.message;}
  });
  choices.addEventListener('change',()=>{name.value=choices.value+'-recovered';});
  document.getElementById('cancel-checkpoint-recovery').addEventListener('click',()=>{if(!recovering)dialog.close();});
  dialog.addEventListener('cancel',event=>{if(recovering)event.preventDefault();});
  confirm.addEventListener('click',async()=>{confirm.disabled=true;recovering=true;
    try{await Frame.project.recoverDurable(choices.value,name.value);dialog.close();}
    catch(error){recovery.textContent=error.message;}finally{confirm.disabled=false;recovering=false;}
  });
  window.addEventListener('frame:design-selected',refresh);
  window.addEventListener('frame:project-restored',refresh);
  window.addEventListener('frame:automatic-checkpoint-status',event=>{
    if(event.detail.generation!==undefined)generations.set(event.detail.designId,event.detail.generation);
  });
  window.addEventListener('beforeunload',event=>{if(saving){event.preventDefault();event.returnValue='';}});
  refresh();
})();
