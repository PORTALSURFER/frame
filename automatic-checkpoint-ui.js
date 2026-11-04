(() => {
  const toggle=document.getElementById('automatic-checkpoints'), retry=document.getElementById('retry-automatic-checkpoint');
  const output=document.getElementById('automatic-checkpoint-status'), api=Frame.project.automaticCheckpoints;
  const current=()=>document.getElementById('design-picker').value;
  function refresh(){
    const status=api.status();toggle.checked=!!status?.enabled;toggle.disabled=!Frame.documents.has(current());
    retry.hidden=!status?.error;output.textContent=status?current()+' · automatic checkpoint '+status.state+(status.error?': '+status.error:''):'';
  }
  toggle.addEventListener('change',()=>{
    try {const promise=toggle.checked?api.enable():api.disable();promise.then(refresh);refresh();}
    catch(error){refresh();output.textContent=error.message;}
  });
  retry.addEventListener('click',()=>api.retry().then(refresh));
  window.addEventListener('frame:design-selected',refresh);
  window.addEventListener('frame:automatic-checkpoint-status',event=>{
    if(event.detail.designId===current())refresh();
    else if(event.detail.error)output.textContent=event.detail.designId+' · automatic checkpoint '+event.detail.state+': '+event.detail.error;
  });
  refresh();
})();
