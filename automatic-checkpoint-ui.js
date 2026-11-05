(() => {
  const toggle=document.getElementById('automatic-checkpoints'), retry=document.getElementById('retry-automatic-checkpoint');
  const output=document.getElementById('automatic-checkpoint-status'), api=Frame.project.automaticCheckpoints;
  const current=()=>document.getElementById('design-picker').value;
  function refresh(){
    const status=api.status();toggle.checked=!!status?.enabled;toggle.disabled=!Frame.documents.has(current());
    retry.hidden=!status?.error;
    Frame.setProjectStatus(output,status?current()+' · automatic checkpoint '+status.state+(status.error?': '+status.error:''):'',!!status?.error);
  }
  toggle.addEventListener('change',()=>{
    try {const promise=toggle.checked?api.enable():api.disable();promise.then(refresh);refresh();}
    catch(error){refresh();Frame.setProjectStatus(output,error.message,true);}
  });
  retry.addEventListener('click',()=>api.retry().then(refresh));
  window.addEventListener('frame:design-selected',refresh);
  window.addEventListener('frame:project-restored',refresh);
  window.addEventListener('frame:automatic-checkpoint-status',event=>{
    if(event.detail.designId===current())refresh();
    else if(event.detail.error)Frame.setProjectStatus(output,event.detail.designId+' · automatic checkpoint '+event.detail.state+': '+event.detail.error,true);
  });
  refresh();
})();
