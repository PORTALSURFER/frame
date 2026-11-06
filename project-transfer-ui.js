(() => {
  const dialog=document.getElementById('project-dialog'),file=document.getElementById('project-file');
  const target=document.getElementById('project-target-id'),preview=document.getElementById('preview-project');
  const confirm=document.getElementById('confirm-project'),cancel=document.getElementById('cancel-project'),status=document.getElementById('project-import-status');
  let input=null,prepared=null,request=0,busy=false;
  function invalidate(){request++;prepared=null;confirm.disabled=true;}
  function lock(value){busy=value;for(const element of [file,target,cancel])element.disabled=value;preview.disabled=value||!input;confirm.disabled=value||!prepared;}
  async function prepare(){
    invalidate();const token=request;
    try{
      if(!input)throw new Error('Choose a portable design file first');
      const candidate=await Frame.project.prepareTransfer(input,{designId:target.value.trim()||undefined});
      if(token!==request||!dialog.open)return;
      prepared=candidate.project;target.value=candidate.summary.targetId;confirm.disabled=false;
      const s=candidate.summary;
      status.textContent='Copy '+s.sourceId+' → '+s.targetId+' · '+s.revisionCount+' revisions · '+s.lineCount+' lines · '+s.noteCount+' notes · '+s.assetCount+' assets. '+
        (s.sourceGuide!==s.targetGuide?'Styleguide copied to '+s.targetGuide+'. ':'')+'The original and existing projects will be preserved. Import stores a checkpoint before opening.';
    }catch(error){if(token===request)status.textContent='Preview unavailable: '+error.message;}
  }
  document.getElementById('open-first-design').addEventListener('click',()=>{
    document.getElementById('import-project').click();
  });
  document.getElementById('import-project').addEventListener('click',()=>{
    invalidate();input=null;file.value='';target.value='';status.textContent='';lock(false);dialog.showModal();
  });
  file.addEventListener('change',async()=>{
    invalidate();input=null;target.value='';preview.disabled=true;const token=request;
    try{
      if(!file.files[0])return;
      if(file.files[0].size>128*1024*1024)throw new Error('Project exceeds the 128 MB import limit');
      const parsed=JSON.parse(await file.files[0].text());if(token!==request)return;
      input=Frame.project.validate(parsed);preview.disabled=false;await prepare();
    }catch(error){if(token===request)status.textContent='Import cancelled: '+error.message;}
  });
  target.addEventListener('input',()=>{invalidate();status.textContent='Preview the destination changes before importing.';});
  preview.addEventListener('click',prepare);
  confirm.addEventListener('click',async()=>{
    if(!prepared||busy)return;lock(true);
    try{
      const receipt=await Frame.project.transfer(prepared);
      if(receipt.resumeReady)dialog.close();
      else status.textContent='Checkpoint stored for '+receipt.id+', but setup is incomplete: '+receipt.error+' Use Recover checkpoint or choose a new destination.';
    }catch(error){status.textContent='Import not completed: '+error.message;}
    finally{invalidate();lock(false);}
  });
  cancel.addEventListener('click',()=>{if(!busy)dialog.close();});
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>{invalidate();input=null;});
})();
