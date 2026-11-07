// Revision snapshots and portable structured projects. Canvas callbacks remain code.
(() => {
  const archives=new Map(),unsaved=new Set(),blocked=new Set();
  const projectExtras=new Map();
  function rememberExtras(project){
    const known=new Set(['format','version','archive','feedback','styleguide','viewport','state','values','assets']);
    projectExtras.set(project.archive.designId,FrameDocument.clone(Object.fromEntries(Object.entries(project).filter(([key])=>!known.has(key)))));
  }
  const copy=FrameDocument.clone;
  const originalRegister=Frame.registerDocument;
  const key=id=>"frame-project-v1:"+id;
  const maxProjectBytes = 128 * 1024 * 1024;
  let registering = false;
  const validatePresets=FrameDocument.validateViewportPresets;
  const sameSize=(a,b)=>a.width===b.width&&a.height===b.height;
  function defaultPresets(size) {
    return copy(size.viewportPresets || [{name:"Design size",width:size.width,height:size.height}]);
  }
  function getViewportPresets(id) {
    const archive=archives.get(id);
    return copy(archive?.viewportPresets||defaultPresets(Frame.agent.getDocument(id)));
  }
  function setViewportPresets(id,input) {
    const archive=archives.get(id);
    if(!archive)throw new Error("Open a structured design to configure its viewport sizes.");
    const presets=validatePresets(input);
    const current=Frame.currentViewport(id);
    const previous=getViewportPresets(id),index=previous.findIndex(preset=>sameSize(preset,current));
    const next=presets.find(preset=>sameSize(preset,current))||
      presets.find(preset=>preset.name===previous[index]?.name)||presets[index]||presets[0];
    archive.viewportPresets=presets;
    Frame.agent.setViewport(id,{width:next.width,height:next.height});
    if(Frame.disk) {
      persist(id);
      window.dispatchEvent(new CustomEvent("frame:viewport-presets-changed",{detail:{id}}));
    }
  }
  function notify() {
    const status=document.getElementById("project-save-notice");
    const needsAttention=Frame.disk?[...unsaved].some(id=>{
      const save=Frame.project?.automaticCheckpoints?.status(id);
      return !save?.enabled||!!save.error;
    }):unsaved.size>0;
    if(status)status.textContent=blocked.size?"Unreadable saved design data is protected. New checkpoints do not replace that original.":needsAttention?"Design changes are unsaved. Download the design before closing or reloading, or retry saving.":"";
    const retry=document.getElementById("retry-project-save");if(retry)retry.hidden=!needsAttention;
  }
  function persist(id) {
    if (Frame.disk) {
      unsaved.add(id); notify(); return;
    }
    try {if(blocked.has(id))throw new Error("Saved project is unreadable and protected");localStorage.setItem(key(id),JSON.stringify(archives.get(id)));unsaved.delete(id);}
    catch {unsaved.add(id);}
    notify();
  }
  function record(doc, sourceRevisionId) {
    const archive=archives.get(doc.id)||{version:1,designId:doc.id,sourceRevisionId:sourceRevisionId||doc.revisionId,currentRevisionId:doc.revisionId,revisions:[]};
    const existing=archive.revisions.find(r=>r.revisionId===doc.revisionId);
    if(existing&&JSON.stringify(existing.document)!==JSON.stringify(doc))throw new Error("A revision ID cannot identify two different documents");
    if(!existing)archive.revisions.push({revisionId:doc.revisionId,capturedAt:new Date().toISOString(),parentRevisionId:archive.currentRevisionId===doc.revisionId?null:archive.currentRevisionId,document:copy(doc)});
    archive.currentRevisionId=doc.revisionId;
    if(sourceRevisionId)archive.sourceRevisionId=sourceRevisionId;
    if(Frame.documents.has(doc.id)) archive.context={viewport:Frame.currentViewport(doc.id),state:Frame.currentState(doc.id),values:Frame.agent.getValues?.(doc.id)||{}};
    archives.set(doc.id,archive);
    return archive;
  }
  function validateArchive(archive) {
    if(!archive||archive.version!==1||typeof archive.designId!=="string"||!Array.isArray(archive.revisions)||!archive.revisions.length)throw new Error("Invalid revision archive");
    if(archive.viewportPresets!==undefined)validatePresets(archive.viewportPresets);
    const ids=new Set();
    for(const revision of archive.revisions) {
      FrameDocument.validate(revision.document);
      if(revision.document.id!==archive.designId||revision.revisionId!==revision.document.revisionId||ids.has(revision.revisionId)||!Number.isFinite(Date.parse(revision.capturedAt)))throw new Error("Invalid revision snapshot");
      ids.add(revision.revisionId);
    }
    if(!ids.has(archive.currentRevisionId))throw new Error("Missing current revision");
    return archive;
  }
  Frame.registerDocument=input=>{
    let archive=null;
    try {const saved=localStorage.getItem(key(input.id));if(saved)archive=copy(validateArchive(FrameArchiveCodec.unpack(JSON.parse(FrameArchiveCodec.decompress(saved)))));}
    catch {blocked.add(input.id);}
    if(archive)archives.set(input.id,archive);
    const document=archive?.sourceRevisionId===input.revisionId?archive.revisions.find(r=>r.revisionId===archive.currentRevisionId).document:input;
    const context=archive?.sourceRevisionId===input.revisionId?copy(archive.context||null):null;
    if(archive&&context?.viewport&&!archive.viewportPresets&&
       [context.viewport.width,context.viewport.height].every(n=>Number.isInteger(n)&&n>=1&&n<=8192)) {
      const presets=defaultPresets(document);
      if(!presets.some(preset=>sameSize(preset,context.viewport)))archive.viewportPresets=defaultPresets(context.viewport);
    }
    const previousRegistering = registering;
    registering = true;
    let result;
    try {
      result=originalRegister(document);
      if(result&&context) {
        if(context.viewport&&[context.viewport.width,context.viewport.height].every(n=>Number.isInteger(n)&&n>0&&n<=8192))Frame.agent.setViewport(input.id,context.viewport);
        if(FrameDocument.hasState(document,context.state))Frame.agent.setState(input.id,context.state);
        if(context.values&&typeof context.values==="object") {
          const values=Object.fromEntries(Object.entries(context.values).filter(([id,value])=>typeof value==="string"&&document.elements.some(n=>n.id===id&&n.type==="input")));
          Frame.agent.setValues?.(input.id,values);
        }
      }
    } finally { registering = previousRegistering; }
    if(result){record(document,input.revisionId);if(!archive && !Frame.disk)persist(input.id);refresh();}
    return result;
  };
  function currentId(){return document.getElementById("design-picker").value;}
  function revision(id,revisionId) {
    const found=archives.get(id)?.revisions.find(r=>r.revisionId===revisionId);if(!found)throw new Error("Unknown revision: "+revisionId);return found;
  }
  function compare(id,beforeId,afterId) {
    const before=revision(id,beforeId).document,after=revision(id,afterId).document;
    const old=new Map(before.elements.map(n=>[n.id,n])),next=new Map(after.elements.map(n=>[n.id,n]));
    return {designId:id,beforeRevisionId:beforeId,afterRevisionId:afterId,
      added:[...next.keys()].filter(id=>!old.has(id)),removed:[...old.keys()].filter(id=>!next.has(id)),
      changed:[...next.keys()].filter(id=>old.has(id)).map(id=>({id,fields:[...new Set([...Object.keys(old.get(id)),...Object.keys(next.get(id))])].filter(k=>JSON.stringify(old.get(id)[k])!==JSON.stringify(next.get(id)[k]))})).filter(item=>item.fields.length),
      settings:["width","height","background","tokens","states"].filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k]))};
  }
  function exportProject(id=currentId(), {shareRevisions = false} = {}) {
    if(!Frame.documents.has(id))throw new Error("Portable export requires a structured design; custom Canvas code stays in its source files");
    if(currentId()!==id)throw new Error("Select the design before exporting its feedback");
    const doc=Frame.agent.getDocument(id),guide=Frame.activeStyleguide;
    const archive=archives.get(id);
    const snapshot=shareRevisions?{...archive,revisions:archive.revisions.map(entry=>({...entry}))}:copy(archive);
    const project = {...copy(projectExtras.get(id)||{}),format:"frame-project",version:1,archive:snapshot,feedback:Frame.agent.getFeedback(),styleguide:guide?copy(guide):null,
      viewport:Frame.currentViewport(id),state:Frame.currentState(id),values:Frame.agent.getValues?.(id)||{},assets:copy(doc.assets||[])};
    Frame.project.captureResume?.(project); return project;
  }
  function validateProject(project, {portable = true} = {}) {
    if(portable && new TextEncoder().encode(JSON.stringify(project)).byteLength>maxProjectBytes)throw new Error("Project exceeds the 128 MB import limit");
    if(project?.format!=="frame-project"||project.version!==1)throw new Error("Unsupported project format");
    if (project.resume !== undefined) {
      const r=project.resume,v=r?.view;
      if(r?.version!==1 || typeof r.automaticCheckpoints!=='boolean' || !v ||
          ![v.zoom,v.panX,v.panY].every(Number.isFinite) || v.zoom<0.25 || v.zoom>8 ||
          (r.legacyDigest!==undefined && r.legacyDigest!==null && !/^[a-f0-9]{64}$/.test(r.legacyDigest))) throw new Error('Invalid checkpoint resume metadata');
    }
    validateArchive(project.archive);
    const doc=project.archive.revisions.find(r=>r.revisionId===project.archive.currentRevisionId).document;
    FrameFeedback.validate(project.feedback,{id:doc.id});
    if(project.feedback.width!==project.viewport?.width||project.feedback.height!==project.viewport?.height||
      ![project.viewport?.width,project.viewport?.height].every(n=>Number.isInteger(n)&&n>0&&n<=8192))throw new Error("Project viewport and feedback dimensions do not match");
    if(!FrameDocument.hasState(doc,project.state))throw new Error("Project has an unknown interface state");
    if(!project.values||typeof project.values!=="object"||Object.keys(project.values).some(id=>!doc.elements.some(n=>n.id===id&&n.type==="input")||typeof project.values[id]!=="string"))throw new Error("Invalid prototype input values");
    if(project.styleguide) {
      const guide=project.styleguide;
      if(typeof guide.id!=="string"||!/^[-a-z0-9]+$/.test(guide.id)||!["name","summary","prompt","document"].every(k=>typeof guide[k]==="string"&&guide[k].trim())||
        !Array.isArray(guide.rules)||!guide.rules.every(v=>typeof v==="string")||!guide.tokens||!Array.isArray(guide.tokens.palette)||
        !guide.tokens.palette.every(c=>typeof c?.name==="string"&&/^#[\da-f]{6}$/i.test(c.value))||!["typography","spacing","geometry"].every(k=>typeof guide.tokens[k]==="string"))throw new Error("Invalid bundled styleguide");
    }
    if(JSON.stringify(project.assets||[])!==JSON.stringify(doc.assets||[]))throw new Error("Bundled assets differ from the current document");
    return project;
  }
  function seedImportedPresets(project) {
    if(project.archive.viewportPresets)return;
    const doc=project.archive.revisions.find(r=>r.revisionId===project.archive.currentRevisionId).document;
    if(doc.viewportPresets || sameSize(doc,project.viewport))return;
    const presets=defaultPresets(doc);
    project.archive.viewportPresets=presets.some(preset=>sameSize(preset,project.viewport))?presets:defaultPresets(project.viewport);
  }
  function importProject(input, {preserveLegacy = false, diskRecovery = false} = {}) {
    const checked=validateProject(input,{portable:!(Frame.disk && diskRecovery)});
    const project=Frame.disk && diskRecovery?checked:copy(checked),id=project.archive.designId;
    seedImportedPresets(project);
    if(Frame.designs.has(id))throw new Error("Project ID already exists; choose an unused ID");
    if(project.styleguide&&Frame.styleguides.has(project.styleguide.id)&&JSON.stringify(Frame.styleguides.get(project.styleguide.id))!==JSON.stringify(project.styleguide))throw new Error("Bundled styleguide conflicts with an existing guide");
    const previousRestore=Frame.restoringProject;
    if(preserveLegacy)Frame.restoringProject=id;
    try {
      if(project.styleguide&&!Frame.styleguides.has(project.styleguide.id)&&!Frame.registerStyleguide(project.styleguide))throw new Error("Bundled styleguide could not be registered");
      if(Frame.designs.has(id))throw new Error("Project ID became occupied during import");
      rememberExtras(project);
      archives.set(id,project.archive);blocked.delete(id);
      const doc=project.archive.revisions.find(r=>r.revisionId===project.archive.currentRevisionId).document;
      if(!originalRegister(doc))throw new Error("Project could not be registered");
      if(!preserveLegacy)persist(id);
      Frame.agent.selectDesign(id);
      Frame.agent.setViewport(id,project.viewport);Frame.agent.setState(id,project.state);Frame.agent.setValues?.(id,project.values);
      if(preserveLegacy)Frame.projectBridge.restoreCheckpointFeedback(project.feedback);
      else Frame.projectBridge.importFeedback(project.feedback);
      if(project.styleguide) {
        if(preserveLegacy)Frame.restoreStyleguide(project.styleguide.id);
        else {const picker=document.getElementById("styleguide-picker");picker.value=project.styleguide.id;picker.dispatchEvent(new Event("change",{bubbles:true}));}
      }
      if(preserveLegacy&&project.resume)Frame.view.set(project.resume.view);
    } finally { if(preserveLegacy)Frame.restoringProject=previousRestore; }
    if(preserveLegacy)window.dispatchEvent(new CustomEvent('frame:project-restored',{detail:{id}}));
    refresh();return id;
  }
  Frame.validateRevision=doc=>{
    const existing=archives.get(doc.id)?.revisions.find(r=>r.revisionId===doc.revisionId);
    if(existing&&JSON.stringify(existing.document)!==JSON.stringify(doc))throw new Error("A revision ID cannot identify two different documents");
  };
  Frame.revisions={
    acknowledgeCheckpoint: archive => {
      const current=archives.get(archive.designId);
      if (Frame.disk) {
        if (!current || current.currentRevisionId!==archive.currentRevisionId || current.sourceRevisionId!==archive.sourceRevisionId ||
            JSON.stringify(current.viewportPresets)!==JSON.stringify(archive.viewportPresets) ||
            current.revisions.length!==archive.revisions.length ||
            current.revisions.some((entry,index)=>entry.document!==archive.revisions[index].document)) return false;
      } else if (JSON.stringify(current) !== JSON.stringify(archive)) return false;
      unsaved.delete(archive.designId); notify(); return true;
    },
    list:id=>copy((archives.get(id)?.revisions||[]).map(({revisionId,capturedAt,parentRevisionId,document})=>({revisionId,capturedAt,parentRevisionId,elementCount:document.elements.length}))),
    get:(id,revisionId)=>copy(revision(id,revisionId).document),
    restore:(id,revisionId)=>Frame.agent.updateDocument(copy(revision(id,revisionId).document)),
    compare,
    retry:()=>{for(const id of [...unsaved]) {
      if (Frame.disk) {
        if(id===currentId()) Frame.project.automaticCheckpoints.ensure(id).catch(()=>{});
      } else persist(id);
    }}
  };
  function restoreStartup(input, expectedSelection) {
    const conflict=message=>{const error=new Error(message);error.name='ConflictError';throw error;};
    const checked=validateProject(input,{portable:!Frame.disk});
    const project=Frame.disk?checked:copy(checked),id=project.archive.designId,old=archives.get(id);
    seedImportedPresets(project);
    if(currentId()!==expectedSelection || Frame.projectBridge.restorationEpoch()!==0 || !Frame.projectBridge.canCheckpoint()) conflict('The open review changed while loading; recover the checkpoint as a separate design.');
    if(Frame.designs.has(id) && !Frame.documents.has(id))conflict('A different source design uses this project ID; both versions are preserved.');
    if(old && (old.sourceRevisionId!==project.archive.sourceRevisionId || !project.archive.revisions.some(r=>r.revisionId===Frame.agent.getDocument(id).revisionId))) conflict('Source and checkpoint have diverged; both versions are preserved.');
    const revisions=new Map(project.archive.revisions.map(r=>[r.revisionId,r]));
    for(const r of old?.revisions||[]) {
      if(revisions.has(r.revisionId) && JSON.stringify(revisions.get(r.revisionId).document)!==JSON.stringify(r.document)) conflict('Conflicting immutable revisions; both versions are preserved.');
      if(!revisions.has(r.revisionId))revisions.set(r.revisionId,r);
    }
    if(project.styleguide && Frame.styleguides.has(project.styleguide.id) && JSON.stringify(Frame.styleguides.get(project.styleguide.id))!==JSON.stringify(project.styleguide)) conflict('The styleguide changed; recover the checkpoint separately.');
    const doc=project.archive.revisions.find(r=>r.revisionId===project.archive.currentRevisionId).document;
    Frame.restoringProject=id;
    try {
      if(project.styleguide&&!Frame.styleguides.has(project.styleguide.id)&&!Frame.registerStyleguide(project.styleguide))throw new Error('Checkpoint styleguide could not be registered');
      rememberExtras(project);
      if(!Frame.documents.has(id)){if(!originalRegister(doc))throw new Error('Checkpoint design could not be registered');}
      else Frame.agent.updateDocument(doc);
      if(currentId()!==id)Frame.agent.selectDesign(id);
      Frame.agent.setViewport(id,project.viewport);Frame.agent.setState(id,project.state);Frame.agent.setValues(id,project.values);
      Frame.projectBridge.restoreCheckpointFeedback(project.feedback);
      archives.set(id,{...project.archive,revisions:[...revisions.values()],context:{viewport:project.viewport,state:project.state,values:project.values}});
      if(project.styleguide)Frame.restoreStyleguide(project.styleguide.id);
      if(project.resume)Frame.view.set(project.resume.view);
      unsaved.delete(id);
    } finally { Frame.restoringProject=null; }
    window.dispatchEvent(new CustomEvent('frame:project-restored',{detail:{id}}));refresh();return id;
  }
  function followSavedRevision(project) {
    const archive=project.archive,id=archive.designId,current=archives.get(id);
    if(current.currentRevisionId===archive.currentRevisionId&&current.sourceRevisionId===archive.sourceRevisionId&&
       current.revisions.length===archive.revisions.length&&JSON.stringify(current.viewportPresets)===JSON.stringify(archive.viewportPresets))return;
    const doc=archive.revisions.find(entry=>entry.revisionId===archive.currentRevisionId).document;
    const values=Frame.agent.getValues(id);
    const inputs=new Set(doc.elements.filter(node=>node.type==="input").map(node=>node.id));
    Frame.restoringProject=id;
    try {
      Frame.agent.updateDocument(doc);
      Frame.agent.setValues(id,Object.fromEntries(Object.entries(values).filter(([key])=>inputs.has(key))));
      archives.set(id,archive);
    } finally { Frame.restoringProject=null; }
    window.dispatchEvent(new CustomEvent("frame:design-updated",{detail:{
      id,fromDisk:true,documentChanged:current.currentRevisionId!==archive.currentRevisionId
    }}));
    refresh();
  }
  Frame.project={export:exportProject,validate:validateProject,import:importProject,restoreStartup,getViewportPresets,setViewportPresets,followSavedRevision,
    hasUnsavedRevision:id=>unsaved.has(id),
    savedDesignCanFollow:(id,project)=>Frame.disk.canRetryProject({archive:archives.get(id)},project),
    readSavedRevision:id=>Frame.disk.readProject(id,archives.get(id).revisions),
    captureDurable:id=>exportProject(id,{shareRevisions:!!Frame.disk})};
  const picker=document.getElementById("revision-picker");
  function refresh() {
    if(!picker)return;
    const id=currentId(),enabled=Frame.documents.has(id);
    picker.disabled=!enabled;
    for(const name of ["restore-revision","download-project"])document.getElementById(name).disabled=!enabled;
    picker.replaceChildren(...(archives.get(id)?.revisions||[]).map(r=>{const o=document.createElement("option");o.value=r.revisionId;o.textContent=r.revisionId;return o;}));
    picker.value=Frame.designs.get(id)?.revisionId||"";
    notify();
  }
  function download(data,filename,type) {
    const url=URL.createObjectURL(new Blob([data],{type})),link=document.createElement("a");link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  if(picker) {
    picker.addEventListener("change",()=>Frame.revisions.restore(currentId(),picker.value));
    document.getElementById("restore-revision").addEventListener("click",()=>Frame.revisions.restore(currentId(),picker.value));
    document.getElementById("download-project").addEventListener("click",()=>download(JSON.stringify(exportProject(),null,2),currentId()+".frame.json","application/json"));
    document.getElementById("retry-project-save").addEventListener("click",Frame.revisions.retry);

  }
  window.addEventListener("frame:design-updated",e=>{
    if(registering || Frame.restoringProject || e.detail.fromDisk)return;
    if(Frame.disk&&!e.detail.documentChanged)return;
    if(Frame.documents.has(e.detail.id)){record(Frame.agent.getDocument(e.detail.id));persist(e.detail.id);refresh();}
  });
  window.addEventListener("frame:design-selected",refresh);
  window.addEventListener("frame:automatic-checkpoint-status",notify);
  window.addEventListener("beforeunload",event=>{if(unsaved.size){event.preventDefault();event.returnValue="";}});
})();
