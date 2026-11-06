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
    try{const record=await Frame.project.readCheckpointHead(id);if(token!==request)return;
      generations.set(id,Frame.project.automaticCheckpoints?.status(id)?.generation??record?.generation??0);save.disabled=saving;
    }catch(error){if(token===request)showStatus(status,'Checkpoint storage unavailable: '+error.message,true);}
  }
  save.addEventListener('click',async()=>{
    const id=current();if(saving||!generations.has(id))return;saving=true;save.disabled=true;
    try{const automatic=Frame.project.automaticCheckpoints;
      const automaticStatus=automatic?.status(id);
      const receipt=automaticStatus?.state==='conflict'?await automatic.retry(id):
        automaticStatus?.enabled?await automatic.save(id):await Frame.project.saveDurable(id,generations.get(id));
      if(receipt.error)throw new Error(receipt.error);generations.set(id,receipt.generation);
      showStatus(status,'Checkpoint saved: '+id+' · generation '+receipt.generation);
    }catch(error){showStatus(status,'Checkpoint not saved: '+error.message+' Download the design to keep a portable backup.',true);}
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
  const library=document.getElementById('design-library'),libraryEntries=document.getElementById('design-library-entries');
  const libraryStatus=document.getElementById('design-library-status'),closeLibrary=document.getElementById('close-design-library');
  const shortcuts=document.getElementById('open-designs'),designMenu=shortcuts.closest('details');
  const menuStatus=document.getElementById('open-design-status');
  let listing=0,opening=false,menuRequest=0;
  async function openDesign(id, output=libraryStatus) {
    if(opening)return;
    opening=true;closeLibrary.disabled=true;shortcuts.inert=true;libraryEntries.inert=true;
    output.hidden=false;output.textContent='Opening design…';
    try {
      if(id!==current()) {
        if(!Frame.designs.has(id)) {
          const saved=await Frame.project.readDurable(id);
          if(!saved)throw new Error('The saved design could not be found.');
          if(!Frame.designs.has(id)) {
            Frame.project.import(saved.project,{preserveLegacy:true,diskRecovery:!!Frame.disk});
            if(saved.project.resume?.automaticCheckpoints) {
              const receipt=await Frame.project.automaticCheckpoints.enable(id);
              if(receipt.error)throw new Error('Design opened. Automatic saving requires review: '+receipt.error);
            }
          } else Frame.agent.selectDesign(id);
        } else Frame.agent.selectDesign(id);
      }
      try {localStorage.setItem('frame-last-design',id);} catch { /* optional */ }
      output.textContent='';menuStatus.hidden=true;
      if(library.open)library.close();
      else {designMenu.open=false;designMenu.querySelector('summary').focus();}
    } catch(error) {output.textContent=error.message;}
    finally {opening=false;closeLibrary.disabled=false;shortcuts.inert=false;libraryEntries.inert=false;}
  }
  function designEntries(saved) {
    const entries=new Map([...Frame.designs].map(([id,design])=>[id,{name:design.name,revisionId:design.revisionId}]));
    for(const record of saved)if(!entries.has(record.id))entries.set(record.id,{name:record.name||record.id,revisionId:record.revisionId});
    return entries;
  }
  function designButton(id,entry,output,showRevision=false) {
    const button=document.createElement('button');
    button.type='button';button.textContent=entry.name;
    if(showRevision&&entry.revisionId) {
      const revision=document.createElement('small');revision.textContent=entry.revisionId;button.append(revision);
    }
    if(id===current())button.setAttribute('aria-current','true');
    button.addEventListener('click',()=>openDesign(id,output));
    return button;
  }
  designMenu.addEventListener('toggle',async()=>{
    const token=++menuRequest;
    if(!designMenu.open)return;
    try {
      const saved=await Frame.project.listDurable();
      if(token!==menuRequest||!designMenu.open)return;
      const entries=designEntries(saved);
      shortcuts.replaceChildren(...Array.from(entries,([id,entry])=>designButton(id,entry,menuStatus)));
      shortcuts.hidden=!entries.size;
    } catch { /* Browse designs reports storage errors. */ }
  });
  function renderLibrary(saved) {
    const entries=designEntries(saved);
    if(!entries.size){libraryEntries.textContent='No designs in this workspace.';return;}
    const list=document.createElement('ul');
    for(const [id,entry] of entries) {
      const item=document.createElement('li');
      item.append(designButton(id,entry,libraryStatus,true));list.append(item);
    }
    libraryEntries.replaceChildren(list);
  }
  document.getElementById('browse-designs').addEventListener('click',async event=>{
    const token=++listing;
    event.currentTarget.closest('details').open=false;
    renderLibrary([]);libraryStatus.textContent='Loading saved designs…';library.showModal();
    try {
      const saved=await Frame.project.listDurable();
      if(token!==listing||!library.open)return;
      renderLibrary(saved);libraryStatus.textContent='';
    } catch(error) {if(token===listing&&library.open)libraryStatus.textContent='Saved designs unavailable: '+error.message;}
  });
  closeLibrary.addEventListener('click',()=>library.close());
  library.addEventListener('cancel',event=>{if(opening)event.preventDefault();});
  window.addEventListener('frame:design-selected',refresh);
  window.addEventListener('frame:project-restored',refresh);
  window.addEventListener('frame:automatic-checkpoint-status',event=>{
    if(event.detail.generation!==undefined)generations.set(event.detail.designId,event.detail.generation);
  });
  window.addEventListener('beforeunload',event=>{if(saving){event.preventDefault();event.returnValue='';}});
  refresh();
})();
