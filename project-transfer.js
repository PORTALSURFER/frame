// Portable transfer never reads another origin. Preview is read-only; commit first
// reserves an unused durable identity, then installs a separate in-memory design.
(() => {
  const copy=FrameDocument.clone, validId=id=>typeof id==='string'&&/^[a-z0-9][a-z0-9_-]*$/i.test(id);
  function conflict(message){const error=new Error(message);error.name='ConflictError';throw error;}
  function unusedLocal(id){
    if(!validId(id))throw new Error('Choose a project ID using letters, numbers, hyphens or underscores');
    if(Frame.designs.has(id))conflict('Project ID '+id+' is already open; choose another ID');
    const legacy=JSON.parse(Frame.project.startupEvidence.legacySnapshot(id));
    if(legacy.some(([key,value])=>key!=='frame-last-design'&&value!==null))conflict('Legacy records already use '+id+'; choose another ID');
  }
  async function unused(id){unusedLocal(id);if(await Frame.project.readDurable(id))conflict('A checkpoint already uses '+id+'; choose another ID');unusedLocal(id);}
  Frame.project.prepareTransfer=async(input,{designId}={})=>{
    const project=copy(Frame.project.validate(input)),sourceId=project.archive.designId,sourceGuide=project.styleguide?.id;
    let target=designId||sourceId;
    try{await unused(target);}catch(error){if(designId||error.name!=='ConflictError')throw error;target=sourceId+'-imported';await unused(target);}
    project.archive.designId=target;
    for(const revision of project.archive.revisions)revision.document.id=target;
    project.feedback.design=target;
    for(const mark of [...project.feedback.lines,...project.feedback.notes])mark.designId=target;
    if(project.styleguide){
      const existing=Frame.styleguides.get(sourceGuide);
      if(existing&&JSON.stringify(existing)!==JSON.stringify(project.styleguide)){
        project.styleguide.id=target+'-guide';
        const destination=Frame.styleguides.get(project.styleguide.id);
        if(destination&&JSON.stringify(destination)!==JSON.stringify(project.styleguide))conflict('The proposed styleguide ID is occupied; choose another project ID');
        for(const revision of project.archive.revisions)if(revision.document.styleguideId===sourceGuide)revision.document.styleguideId=project.styleguide.id;
      }
    }
    if(project.resume)delete project.resume.legacyDigest;
    Frame.project.validate(project);
    return {project,summary:{sourceId,targetId:target,revisionCount:project.archive.revisions.length,
      lineCount:project.feedback.lines.length,noteCount:project.feedback.notes.length,assetCount:(project.assets||[]).length,
      sourceGuide:sourceGuide||null,targetGuide:project.styleguide?.id||null,viewport:project.viewport,state:project.state}};
  };
  Frame.project.transfer=async(input)=>{
    const project=copy(Frame.project.validate(input)),id=project.archive.designId;
    await unused(id);
    const current=document.getElementById('design-picker').value,automatic=Frame.project.automaticCheckpoints;
    if(automatic.status(current)?.enabled)await automatic.flush(current);
    unusedLocal(id);
    // This raw copied snapshot has no destination provenance. If installation
    // fails, it remains explicitly recoverable and cannot replace startup state.
    if(project.resume)delete project.resume.legacyDigest;
    const reserved=await Frame.project.writeDurable(project,0);
    let opened=false,generation=reserved.generation;
    try{
      unusedLocal(id);
      Frame.project.import(project,{preserveLegacy:true});opened=true;
      // Explicitly selecting the imported copy changes only the last-selection
      // preference. Project/feedback legacy records remain untouched.
      localStorage.setItem('frame-last-design',id);
      const installed=Frame.project.export(id);
      installed.resume.automaticCheckpoints=project.resume?.automaticCheckpoints||false;
      const receipt=await Frame.project.writeDurable(installed,reserved.generation);
      generation=receipt.generation;
      if(installed.resume.automaticCheckpoints){const state=await automatic.enable(id);if(state.error)throw new Error(state.error);generation=state.generation;}
      return {id,saved:true,opened:true,resumeReady:true,generation};
    }catch(error){return {id,saved:true,opened,resumeReady:false,generation,error:error.message};}
  };
})();
