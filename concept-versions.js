// Scoped alternatives reuse independent projects for annotation and revision isolation.
(() => {
  const copy=FrameDocument.clone,current=()=>document.getElementById('design-picker').value;
  let busy=false;
  const notify=()=>window.dispatchEvent(new Event('frame:concepts-changed'));
  function context() {
    const id=current(),doc=Frame.agent.getDocument(id),viewport=Frame.currentViewport(id),state=Frame.currentState(id);
    const view=FrameDocument.viewportViews(doc,viewport.width).find(view=>view.contexts.some(item=>item.id===state));
    const reference=doc.metadata?.frameConcept;
    return {rootId:reference?.rootId||id,designId:id,scope:{viewId:view?.id||null,state,...viewport},reference};
  }
  async function family(ctx=context()) {
    const record=await Frame.conceptStore.read(ctx.rootId);
    const data=record?.data||{version:1,designId:ctx.rootId,groups:[]};
    return {record,data,group:data.groups.find(group=>FrameConceptModel.sameScope(group.scope,ctx.scope)),context:ctx};
  }
  async function operation(action) {
    if(busy)throw new Error('Finish the current version action first.');
    busy=true;notify();
    try{return await action();}finally{busy=false;notify();}
  }
  async function saveCurrent() {
    if(!Frame.projectBridge.canCheckpoint())throw new Error('Finish the current annotation before switching versions.');
    const id=current(),epoch=Frame.projectBridge.restorationEpoch();
    const receipt=await Frame.project.automaticCheckpoints.ensure(id);
    if(receipt?.error)throw new Error(receipt.error);
    if(current()!==id||Frame.projectBridge.restorationEpoch()!==epoch)throw new Error('The review changed while saving. Retry the version action.');
  }
  async function projectFor(id) {
    if(id===current())return Frame.project.export(id);
    if(Frame.project.hasUnsavedRevision(id))throw new Error('Save pending changes in '+id+' before exporting the family.');
    const saved=await Frame.project.readDurable(id);
    if(!saved)throw new Error('Saved concept is unavailable: '+id);
    const project=saved.project,feedback=Frame.projectBridge.feedbackForDesign(id);
    if(feedback)project.feedback=copy(feedback);
    else if(Frame.disk){const record=await Frame.disk.read('feedback',id);if(record)project.feedback=copy(record.data);}
    return project;
  }
  async function open(id,scope,view) {
    if(!Frame.documents.has(id)) {
      const saved=await Frame.project.readDurable(id);
      if(!saved)throw new Error('Saved concept is unavailable: '+id);
      Frame.project.import(saved.project,{preserveLegacy:true,diskRecovery:!!Frame.disk});
    } else Frame.agent.selectDesign(id);
    const doc=Frame.agent.getDocument(id);
    scope={...scope,state:FrameDocument.resolveState(doc,scope.width,scope.state)};
    if(!FrameDocument.viewportStates(doc,scope.width).includes(scope.state))throw new Error('This concept does not contain the requested state.');
    Frame.agent.setViewport(id,{width:scope.width,height:scope.height});Frame.agent.setState(id,scope.state);
    Frame.view.set(view);
    try{localStorage.setItem('frame-last-design',id);}catch{/* optional last selection */}
    const receipt=await Frame.project.automaticCheckpoints.ensure(id);if(receipt?.error)throw new Error(receipt.error);
    return id;
  }
  function makeProject(source,ctx,groupId,name,{document,keepFeedback=false}={}) {
    const versionId=crypto.randomUUID(),id=ctx.rootId.slice(0,70)+'-concept-'+versionId;
    const doc=copy(document||source.archive.revisions.find(r=>r.revisionId===source.archive.currentRevisionId).document);
    const sourceName=doc.metadata?.frameConcept?.sourceName||doc.name;
    doc.id=id;doc.name=sourceName+' · '+name;
    doc.metadata={...doc.metadata,frameConcept:{rootId:ctx.rootId,groupId,versionId,scope:ctx.scope,sourceName},revisionTitle:'Initial concept'};
    FrameDocument.validate(doc);
    if(!FrameDocument.viewportStates(doc,ctx.scope.width).includes(ctx.scope.state))throw new Error('New concept must contain the comparison state.');
    const feedback=keepFeedback?copy(source.feedback):{version:3,design:id,revisionId:doc.revisionId,width:ctx.scope.width,height:ctx.scope.height,lines:[],notes:[]};
    feedback.design=id;
    for(const mark of [...feedback.lines,...feedback.notes])mark.designId=id;
    const required=new Set([doc.revisionId]);
    for(const mark of [...feedback.lines,...feedback.notes])for(const revision of [mark.revisionId,mark.anchorRevisionId,mark.review?.revisionId])if(revision)required.add(revision);
    const revisions=source.archive.revisions.filter(r=>required.has(r.revisionId)&&r.revisionId!==doc.revisionId).map(r=>({...copy(r),document:{...copy(r.document),id}}));
    revisions.push({revisionId:doc.revisionId,parentRevisionId:null,capturedAt:new Date().toISOString(),document:doc});
    const project={name:doc.name,format:'frame-project',version:1,concept:doc.metadata.frameConcept,archive:{version:1,designId:id,sourceRevisionId:doc.revisionId,currentRevisionId:doc.revisionId,revisions,viewportPresets:copy(source.archive.viewportPresets||[{name:'Design size',width:ctx.scope.width,height:ctx.scope.height}])},
      feedback,styleguide:copy(source.styleguide),viewport:{width:ctx.scope.width,height:ctx.scope.height},state:ctx.scope.state,values:copy(source.values),assets:copy(doc.assets||[]),
      resume:{version:1,automaticCheckpoints:true,view:copy(source.resume?.view||{zoom:1,panX:0,panY:0})}};
    Frame.project.validate(project);
    return {project,version:{id:versionId,designId:id,name,createdAt:new Date().toISOString()}};
  }
  Frame.concepts={
    context,family,busy:()=>busy,
    create:options=>operation(async()=>{
      const name=typeof options?.name==='string'?options.name.trim():'New version';if(!name||name.length>120)throw new Error('Give the version a name of up to 120 characters.');
      await saveCurrent();const ctx=context(),view=Frame.view.get(),state=await family(ctx),source=Frame.project.export();
      let group=state.group;const pending=[];
      if(!group){group={id:crypto.randomUUID(),scope:ctx.scope,chosenId:null,versions:[]};state.data.groups.push(group);pending.push(makeProject(source,ctx,group.id,'Original',{keepFeedback:true}));}
      if(group.versions.length+pending.length>=32)throw new Error('A comparison supports up to 32 versions.');
      const next=makeProject(source,ctx,group.id,name,options);pending.push(next);
      for(const item of pending)group.versions.push(item.version);
      FrameConceptModel.validate(state.data);
      // Reserve copies before publishing references; failed copies remain recoverable.
      for(const item of pending)await Frame.project.writeDurable(item.project,0);
      await Frame.conceptStore.save(state.data,state.record?.generation||0);
      await open(next.version.designId,ctx.scope,view);notify();return next.version;
    }),
    select:versionId=>operation(async()=>{
      const ctx=context(),state=await family(ctx),version=state.group?.versions.find(v=>v.id===versionId);
      if(!version)throw new Error('Unknown concept version in this comparison.');
      await saveCurrent();return open(version.designId,ctx.scope,Frame.view.get());
    }),
    navigate:destination=>operation(async()=>{
      const ctx=context(),view=Frame.view.get();await saveCurrent();
      let scope={...ctx.scope,...destination};
      if(destination.viewId){
        let doc=Frame.documents.get(ctx.rootId);
        if(!doc){const saved=await Frame.project.readDurable(ctx.rootId);doc=saved?.project.archive.revisions.find(r=>r.revisionId===saved.project.archive.currentRevisionId).document;}
        if(!doc)throw new Error('The source design is unavailable.');
        const target=FrameDocument.viewportViews(doc,scope.width).find(v=>v.id===destination.viewId);
        if(!target)throw new Error('Unknown screen.');scope.state=target.contexts[0].id;
      }
      await open(ctx.rootId,scope,view);
      const state=await family(context());
      if(state.group){const selected=state.group.versions.find(v=>v.id===state.group.chosenId)||state.group.versions[0];await open(selected.designId,state.group.scope,view);}
      return current();
    }),
    choose:versionId=>operation(async()=>{
      const state=await family();if(!state.group?.versions.some(v=>v.id===versionId))throw new Error('Unknown concept version.');
      state.group.chosenId=versionId;await Frame.conceptStore.save(state.data,state.record.generation);notify();return versionId;
    }),
    rename:(versionId,name)=>operation(async()=>{
      const state=await family(),version=state.group?.versions.find(v=>v.id===versionId);
      if(!version)throw new Error('Unknown concept version.');version.name=typeof name==='string'?name.trim():'';FrameConceptModel.validate(state.data);
      await Frame.conceptStore.save(state.data,state.record.generation);notify();return version;
    }),
    async review(ctx=context()) {
      const state=await family(ctx),versions=[];
      for(const version of state.group?.versions||[]){
        const project=await projectFor(version.designId),doc=Frame.documents.has(version.designId)?Frame.agent.getDocument(version.designId):project.archive.revisions.find(r=>r.revisionId===project.archive.currentRevisionId).document;
        versions.push({...version,chosen:version.id===state.group.chosenId,document:doc,feedback:project.feedback});
      }
      return {rootId:ctx.rootId,scope:ctx.scope,chosenId:state.group?.chosenId||null,versions};
    },
    async reviewAll() {
      const state=await family(),groups=[];
      for(const group of state.data.groups)groups.push(await Frame.concepts.review({rootId:state.data.designId,scope:group.scope}));
      return {rootId:state.data.designId,groups};
    },
    export:()=>operation(async()=>{
      await saveCurrent();const state=await family();if(!state.record)throw new Error('Create a version before exporting a concept family.');
      const ids=[state.data.designId,...state.data.groups.flatMap(g=>g.versions.map(v=>v.designId))],projects=[];
      for(const id of ids)projects.push(await projectFor(id));
      return FrameConceptModel.envelope({format:'frame-concepts',version:1,family:state.data,projects});
    }),
    import:(input,{rootId}={})=>operation(async()=>{
      const bundle=copy(FrameConceptModel.envelope(input));for(const project of bundle.projects)Frame.project.validate(project);
      const source=bundle.family.designId,target=rootId||source.slice(0,65)+'-imported-'+crypto.randomUUID().slice(0,8);
      if(!FrameConceptModel.validId(target))throw new Error('Choose a valid source design ID.');
      const ids=new Map(bundle.projects.map(p=>[p.archive.designId,p.archive.designId===source?target:target.slice(0,70)+'-concept-'+crypto.randomUUID()]));
      if(await Frame.conceptStore.read(target))throw new Error('A concept family already uses this identity.');
      for(const id of ids.values())if(Frame.designs.has(id)||await Frame.project.readDurable(id)||JSON.parse(Frame.project.startupEvidence.legacySnapshot(id)).some(([key,value])=>key!=='frame-last-design'&&value!==null))throw new Error('A saved design already uses '+id);
      bundle.family.designId=target;
      for(const group of bundle.family.groups)for(const version of group.versions)version.designId=ids.get(version.designId);
      for(const project of bundle.projects){
        const id=ids.get(project.archive.designId);project.archive.designId=id;
        for(const entry of project.archive.revisions){entry.document.id=id;const reference=entry.document.metadata?.frameConcept;if(reference)reference.rootId=target;}
        if(project.concept)project.concept.rootId=target;
        project.feedback.design=id;for(const mark of [...project.feedback.lines,...project.feedback.notes])mark.designId=id;
        if(project.resume)delete project.resume.legacyDigest;Frame.project.validate(project);
      }
      FrameConceptModel.envelope(bundle);
      await saveCurrent();for(const project of bundle.projects)await Frame.project.writeDurable(project,0);
      await Frame.conceptStore.save(bundle.family,0);
      const project=bundle.projects.find(p=>p.archive.designId===target);Frame.project.import(project,{preserveLegacy:true,diskRecovery:!!Frame.disk});
      await Frame.project.automaticCheckpoints.ensure(target);notify();return target;
    })
  };
  Frame.agent.concepts=Frame.concepts;
})();
