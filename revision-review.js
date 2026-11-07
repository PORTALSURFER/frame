// Historical review uses detached renderings; browsing never changes the live head.
(() => {
  const dialog=document.createElement('dialog');dialog.id='revision-review';dialog.dataset.textEditor='';
  dialog.setAttribute('aria-labelledby','revision-review-title');
  dialog.innerHTML=`<div class="review-heading"><h2 id="revision-review-title">Revision history</h2><button id="close-revision-review" type="button">Close</button></div>
    <p id="revision-review-context"></p><div class="revision-workspace"><aside aria-label="Revision history"><div id="revision-timeline"></div><button id="earlier-revisions" type="button">Show earlier revisions</button></aside>
    <section class="revision-comparison" aria-label="Revision comparison"><div class="comparison-controls">
    <label>Before<select id="review-before"></select></label><label>After<select id="review-after"></select></label>
    <label><input id="review-overlay" type="checkbox"> Overlay</label><button id="review-fit" type="button">Fit comparison</button></div>
    <p id="revision-diff" role="status"></p><div class="revision-images"><figure><figcaption>Before</figcaption><div class="revision-picture"><canvas id="review-before-image" role="img" aria-label="Before revision"></canvas></div></figure><figure><figcaption>After</figcaption><div class="revision-picture"><canvas id="review-after-image" role="img" aria-label="After revision"></canvas></div></figure></div>
    <div class="review-heading"><p id="revision-review-status" role="status"></p><button id="restore-history-revision" type="button">Restore this revision</button></div></section></div>`;
  document.body.append(dialog);
  const byId=id=>dialog.querySelector('#'+id),before=byId('review-before'),after=byId('review-after');
  const timeline=byId('revision-timeline'),images=dialog.querySelector('.revision-images');
  const status=byId('revision-review-status'),restore=byId('restore-history-revision');
  let session=null,generation=0,limit=20,zoom=1,panX=0,panY=0,drag=null;
  function contextFor(doc,requested) {
    return FrameDocument.hasState(doc,requested)?FrameDocument.resolveState(doc,session.viewport.width,requested):'default';
  }
  async function paint(canvas,doc,viewport,state,token) {
    await document.fonts.ready;await FrameDocument.prepareAssets(doc);
    if(token!==generation||!dialog.open)return;
    const scale=Math.min(1,1600/viewport.width,1600/viewport.height);
    canvas.width=Math.max(1,Math.round(viewport.width*scale));canvas.height=Math.max(1,Math.round(viewport.height*scale));
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
    FrameDocument.render(ctx,doc,{viewport,state});
  }
  function transform() {
    if(!session)return;
    const pictures=[...dialog.querySelectorAll('.revision-picture')];
    const fit=Math.min(...pictures.map(n=>Math.min(n.clientWidth/session.viewport.width,n.clientHeight/session.viewport.height)));
    for(const canvas of images.querySelectorAll('canvas')){
      canvas.style.width=session.viewport.width*fit+'px';canvas.style.height=session.viewport.height*fit+'px';
      canvas.style.transform=`translate(-50%,-50%) translate(${panX}px,${panY}px) scale(${zoom})`;
    }
    images.dataset.zoom=String(zoom);images.dataset.panX=String(panX);images.dataset.panY=String(panY);
  }
  async function render() {
    if(!session||!dialog.open)return;
    const token=++generation,id=session.id;
    dialog.dataset.rendering="true";
    try {
      const a=Frame.revisions.get(id,before.value),b=Frame.revisions.get(id,after.value);
      const diff=Frame.revisions.compare(id,before.value,after.value);
      const aState=contextFor(a,session.state),bState=contextFor(b,session.state);
      byId('revision-diff').textContent=`${diff.changed.length} changed · ${diff.added.length} added · ${diff.removed.length} removed · ${diff.settings.length} design settings changed`;
      byId('revision-review-context').textContent=`${Frame.designs.get(id).name} · ${session.viewport.width} × ${session.viewport.height} · ${session.state}. Read-only preview.${aState!==session.state||bState!==session.state?' A revision without this state is shown in its default state.':''}`;
      restore.disabled=after.value===Frame.agent.getDocument(id).revisionId;
      status.textContent=restore.disabled?'This is the current revision.':'Preview only. Restore explicitly to make this the current revision.';
      for(const card of timeline.querySelectorAll('button'))card.setAttribute('aria-pressed',String(card.dataset.revisionId===after.value));
      await Promise.all([paint(byId('review-before-image'),a,session.viewport,aState,token),paint(byId('review-after-image'),b,session.viewport,bState,token)]);
      if(token===generation){transform();dialog.dataset.rendering="false";}
    }catch(error){if(token===generation){status.textContent=error.message;restore.disabled=true;dialog.dataset.rendering="false";}}
  }
  function renderTimeline() {
    const entries=[...Frame.revisions.list(session.id)].reverse().slice(0,limit);
    timeline.replaceChildren();
    for(const entry of entries){
      const card=document.createElement('button');card.type='button';card.className='revision-card';card.dataset.revisionId=entry.revisionId;
      const thumbnail=document.createElement('canvas');thumbnail.setAttribute('aria-hidden','true');
      const label=document.createElement('strong');label.textContent=entry.title;
      const date=document.createElement('small');date.textContent=new Date(entry.capturedAt).toLocaleString();
      card.append(thumbnail,label,date);card.title=entry.revisionId;
      card.addEventListener('click',()=>{after.value=entry.revisionId;render();});timeline.append(card);
      const doc=Frame.revisions.get(session.id,entry.revisionId),scale=Math.min(180/doc.width,110/doc.height);
      thumbnail.width=Math.max(1,Math.round(doc.width*scale));thumbnail.height=Math.max(1,Math.round(doc.height*scale));
      FrameDocument.prepareAssets(doc).then(()=>{
        if(!card.isConnected||!dialog.open)return;
        const ctx=thumbnail.getContext('2d');ctx.scale(scale,scale);FrameDocument.render(ctx,doc,{state:'default'});
      }).catch(()=>{label.textContent=entry.title+' (preview unavailable)';});
    }
    byId('earlier-revisions').hidden=entries.length>=Frame.revisions.list(session.id).length;
  }
  function open(id=document.getElementById('design-picker').value,options={}) {
    if(!Frame.documents.has(id))throw new Error('Open a structured design to review revisions.');
    const entries=Frame.revisions.list(id),head=Frame.agent.getDocument(id).revisionId;
    const target=options.afterRevisionId||head;
    const selected=entries.find(entry=>entry.revisionId===target);
    if(!selected)throw new Error('Unknown revision: '+target);
    const source=options.beforeRevisionId||(target===head?selected.parentRevisionId:head)||head;
    Frame.revisions.get(id,source);
    session={id,head,viewport:options.viewport||Frame.currentViewport(id),state:options.state||Frame.currentState(id)};
    for(const picker of [before,after])picker.replaceChildren(...entries.map(entry=>new Option(entry.title,entry.revisionId)));
    before.value=source;after.value=target;limit=20;zoom=1;panX=panY=0;
    document.querySelector('.project-menu').open=false;
    if(!dialog.open)dialog.showModal();
    renderTimeline();render();
  }
  byId('revision-review-title').textContent='Revision history';
  document.getElementById('revision-history').addEventListener('click',()=>open());
  byId('close-revision-review').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{if(dialog.open)return;generation++;session=null;drag=null;});
  for(const picker of [before,after])picker.addEventListener('change',render);
  byId('earlier-revisions').addEventListener('click',()=>{limit+=20;renderTimeline();});
  byId('review-overlay').addEventListener('change',event=>{images.classList.toggle('overlay',event.target.checked);transform();});
  byId('review-fit').addEventListener('click',()=>{zoom=1;panX=panY=0;transform();});
  images.addEventListener('wheel',event=>{
    event.preventDefault();zoom=Math.max(.25,Math.min(8,zoom*Math.exp(-event.deltaY*.002)));transform();
  },{passive:false});
  images.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,panX,panY};images.setPointerCapture(event.pointerId);
  });
  images.addEventListener('pointermove',event=>{if(drag?.id===event.pointerId){panX=drag.panX+event.clientX-drag.x;panY=drag.panY+event.clientY-drag.y;transform();}});
  function finish(event){if(drag?.id!==event.pointerId)return;if(event.type==='pointercancel'){panX=drag.panX;panY=drag.panY;transform();}drag=null;}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])images.addEventListener(type,finish);
  restore.addEventListener('click',()=>{
    if(Frame.agent.getDocument(session.id).revisionId!==session.head){status.textContent='The design changed during review. Close and reopen history before restoring.';restore.disabled=true;return;}
    Frame.revisions.restore(session.id,after.value);dialog.close();
  });
  const refresh=()=>{document.getElementById('revision-history').disabled=!Frame.documents.has(document.getElementById('design-picker').value);};
  window.addEventListener('frame:design-selected',()=>{if(dialog.open)dialog.close();refresh();});
  new ResizeObserver(transform).observe(images);
  Frame.revisionReview={open};refresh();
})();
