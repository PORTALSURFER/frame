// Versions stay on the working surface; infrequent family and guide actions live in Designs.
(() => {
  const byId=id=>document.getElementById(id),picker=byId('concept-version'),add=byId('new-concept'),choose=byId('choose-concept');
  const rename=byId('rename-concept'),download=byId('download-concepts'),status=byId('concept-status');
  const dialog=document.createElement('dialog');dialog.id='concept-dialog';dialog.dataset.textEditor='';
  dialog.innerHTML='<form id="concept-form"><h2 id="concept-title">New version</h2><label>Name<input id="concept-name" maxlength="120" required></label><p id="concept-error" role="status"></p><div class="note-actions"><button id="cancel-concept" type="button">Cancel</button><button type="submit">Create</button></div></form>';
  dialog.setAttribute('aria-labelledby','concept-title');document.body.append(dialog);
  const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.hidden=true;document.body.append(file);
  let generation=0,state=null,renaming=false,pending=null,selecting=false,selectionDone=Promise.resolve(),navigationDone=Promise.resolve(),autoTarget=null;
  function report(error){Frame.setProjectStatus(status,error?.message||'',!!error);}
  function restoreFocus(target){if(target?.isConnected&&(document.activeElement===document.body||document.activeElement===target))target.focus({preventScroll:true});}
  async function refresh() {
    const token=++generation,id=byId('design-picker').value,enabled=Frame.documents.has(id),busy=Frame.concepts.busy();
    add.disabled=!enabled||busy;rename.disabled=choose.disabled=download.disabled=true;
    if(!enabled){picker.replaceChildren(new Option('Original',''));picker.disabled=true;return;}
    try{
      const next=await Frame.concepts.family();if(token!==generation)return;state=next;
      const versions=next.group?.versions||[],selected=versions.find(v=>v.designId===id);
      picker.replaceChildren(...(versions.length?versions.map(v=>new Option(v.name+(v.id===next.group.chosenId?' ✓':''),v.id)):[new Option('Original','')]));
      picker.disabled=!versions.length||(busy&&!selecting);picker.value=pending||selected?.id||versions[0]?.id||'';
      choose.disabled=rename.disabled=!selected||busy;download.disabled=!next.record||busy;
      choose.setAttribute('aria-pressed',String(!!selected&&selected.id===next.group.chosenId));
      choose.title=selected?.id===next.group?.chosenId?'Chosen version':'Use this version';
      if(selected||!versions.length)autoTarget=null;
      if(versions.length&&!selected&&!busy&&!selecting&&autoTarget!==next.group.id){autoTarget=next.group.id;queue(next.group.chosenId||versions[0].id);}
    }catch(error){if(token===generation){picker.disabled=true;report(error);}}
  }
  function queue(id) {
    pending=id;if(selecting)return selectionDone;selecting=true;const focus=document.activeElement;
    selectionDone=(async()=>{
      try{
        while(pending){const target=pending;await Frame.concepts.select(target);if(pending===target)pending=null;}
        report();
      }catch(error){pending=null;report(error);}
      finally{selecting=false;await refresh();restoreFocus(focus);}
    })();
    return selectionDone;
  }
  picker.addEventListener('change',()=>queue(picker.value));
  function show(renameCurrent=false){
    renaming=renameCurrent;byId('concept-title').textContent=renaming?'Rename version':'New version';
    byId('concept-name').value=renaming?state.group.versions.find(v=>v.designId===state.context.designId).name:'Version '+((state?.group?.versions.length||1)+1);
    byId('concept-error').textContent='';dialog.querySelector('[type="submit"]').textContent=renaming?'Save':'Create';
    byId('concept-name').disabled=false;dialog.showModal();byId('concept-name').select();
  }
  add.addEventListener('click',()=>show());rename.addEventListener('click',()=>show(true));
  byId('cancel-concept').addEventListener('click',()=>dialog.close());
  byId('concept-form').addEventListener('submit',async event=>{
    event.preventDefault();const submit=dialog.querySelector('[type="submit"]');submit.disabled=true;
    try{
      const name=byId('concept-name').value;
      if(renaming)await Frame.concepts.rename(state.group.versions.find(v=>v.designId===state.context.designId).id,name);
      else await Frame.concepts.create({name});
      dialog.close();await refresh();picker.focus();report();
    }catch(error){byId('concept-error').textContent=error.message;}
    finally{submit.disabled=false;}
  });
  choose.addEventListener('click',async()=>{try{await Frame.concepts.choose(picker.value);report();}catch(error){report(error);}});
  download.addEventListener('click',async()=>{
    try{
      const bundle=await Frame.concepts.export(),url=URL.createObjectURL(new Blob([JSON.stringify(bundle)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=bundle.family.designId+'.concepts.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);report();
    }catch(error){report(error);}
  });
  byId('import-concepts').addEventListener('click',()=>file.click());
  file.addEventListener('change',async()=>{
    try{if(file.files[0]){if(file.files[0].size>256*1024*1024)throw new Error('Concept family exceeds the 256 MB import limit.');await Frame.concepts.import(JSON.parse(await file.files[0].text()));report();}}
    catch(error){report(error);}finally{file.value='';}
  });
  document.addEventListener('change',event=>{
    const id=event.target.id;if(!['viewport-picker','view-picker','context-picker','state-picker'].includes(id))return;
    if(!selecting&&!Frame.documents.get(byId('design-picker').value)?.metadata?.frameConcept)return;
    event.stopImmediatePropagation();const target=event.target,value=target.value;
    const destination=id==='viewport-picker'?{width:Number(value.split('×')[0]),height:Number(value.split('×')[1])}:id==='view-picker'?{viewId:value}:{state:value};
    navigationDone=navigationDone.then(async()=>{await selectionDone;await Frame.concepts.navigate(destination);report();restoreFocus(target);}).catch(report);
  },true);
  for(const event of ['frame:design-selected','frame:design-updated','frame:project-restored','frame:concepts-changed'])window.addEventListener(event,refresh);
  refresh();
})();
