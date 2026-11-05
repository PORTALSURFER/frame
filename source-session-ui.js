(() => {
  const button=document.getElementById('source-settings'),dialog=document.getElementById('source-dialog');
  const url=document.getElementById('source-url'),interval=document.getElementById('source-interval');
  const connect=document.getElementById('connect-source'),disconnect=document.getElementById('disconnect-source');
  const message=document.getElementById('source-message'),output=document.getElementById('live-document-status');
  const current=()=>document.getElementById('design-picker').value;
  let request=0,designId;
  function refresh(){
    const id=current();
    button.disabled=!Frame.documents.has(id);
    let status=Frame.sources.status(id);
    if(status.state==='disconnected'){
      const watch=Frame.agent.watchStatus(id);
      if(watch&&watch.state!=='stopped')status=watch;
    }
    Frame.setProjectStatus(output,status.state==='disconnected'?'':id+' · source '+(status.error||status.state),!!status.error);
  }
  button.addEventListener('click',async()=>{
    const token=++request;designId=current();connect.disabled=disconnect.disabled=url.disabled=interval.disabled=true;
    url.value='';interval.value='1000';message.textContent='Reading source settings…';dialog.showModal();
    try{
      const saved=await Frame.sources.settings(designId);
      if(token!==request||!dialog.open||designId!==current())return;
      url.value=saved?.url||'';interval.value=String(saved?.interval||1000);
      connect.disabled=url.disabled=interval.disabled=false;disconnect.disabled=!saved?.enabled&&Frame.sources.status(designId).state==='disconnected';
      message.textContent=Frame.sources.status(designId).error||'Connect a matching JSON document at this Frame address. Verified settings reconnect after refresh; imported files never start a source connection.';
    }catch(error){if(token===request&&dialog.open)message.textContent=error.message;}
  });
  function close(){request++;dialog.close();}
  document.getElementById('cancel-source').addEventListener('click',close);
  dialog.addEventListener('cancel',()=>{request++;});
  connect.addEventListener('click',async()=>{
    const options={designId,url:url.value.trim(),interval:Number(interval.value)};
    close();
    try{await Frame.sources.connect(options);refresh();}catch(error){refresh();if(options.designId===current())Frame.setProjectStatus(output,'Source not connected: '+error.message,true);}
  });
  disconnect.addEventListener('click',async()=>{
    const id=designId;close();
    try{await Frame.sources.disconnect(id);refresh();}catch(error){if(id===current())Frame.setProjectStatus(output,error.message,true);}
  });
  for(const event of ['frame:design-selected','frame:project-restored'])window.addEventListener(event,()=>{if(dialog.open)close();refresh();});
  window.addEventListener('frame:source-session-status',refresh);
  window.addEventListener('frame:watch-status',event=>{if(event.detail.designId===current())refresh();});
  refresh();
})();
