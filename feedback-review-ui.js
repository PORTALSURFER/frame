// Keep human feedback and its original review context visible during iteration.
(() => {
  const app=document.querySelector('.app'),menu=document.getElementById('feedback-menu');
  const panel=document.getElementById('feedback-panel'),pin=document.getElementById('pin-feedback');
  const detail=document.getElementById('feedback-review-detail'),dock=document.createElement('aside');
  dock.id='feedback-dock';dock.hidden=true;dock.setAttribute('aria-label','Pinned feedback');app.append(dock);
  const title=document.createElement('strong'),context=document.createElement('p'),proposal=document.createElement('p'),warning=document.createElement('p');
  const actions=document.createElement('div');actions.className='feedback-review-actions';
  const locate=document.createElement('button'),original=document.createElement('button'),compare=document.createElement('button');
  for(const button of [locate,original,compare])button.type='button';
  locate.textContent='Locate target';original.textContent='Show original';compare.textContent='Review change';
  actions.append(locate,original,compare);detail.append(title,context,proposal,warning,actions);
  const outline=document.createElementNS('http://www.w3.org/2000/svg','svg');outline.id='feedback-target';outline.setAttribute('aria-hidden','true');
  document.getElementById('board').append(outline);
  let pinned=false;
  const current=()=>document.getElementById('design-picker').value;
  function setPinned(next) {
    pinned=next;app.classList.toggle('feedback-pinned',pinned);dock.hidden=!pinned;
    (pinned?dock:menu).append(panel);pin.setAttribute('aria-pressed',String(pinned));pin.textContent=pinned?'Unpin feedback':'Pin feedback';
    if(pinned)menu.open=true;
    try{localStorage.setItem('frame-feedback-pinned',String(pinned));}catch{/* Optional preference. */}
    refresh();
  }
  function snapshotAvailable(revisionId) {
    if(!revisionId)return false;
    try{Frame.revisions.get(current(),revisionId);return true;}catch{return false;}
  }
  function targetFor(mark) {
    if(!mark?.elementAnchor||!Frame.documents.has(current()))return null;
    return Frame.agent.inspect(current(),{elementId:mark.elementAnchor.elementId}).find(node=>node.visible!==false)||null;
  }
  function locateTarget(force=true) {
    const mark=Frame.feedback.selected();if(!mark)return;
    const target=targetFor(mark),point=target?[target.bounds.x+target.bounds.width/2,target.bounds.y+target.bounds.height/2]:mark.anchor||mark.points?.[0];
    if(!point)return;
    const board=document.getElementById('board').getBoundingClientRect(),stage=document.getElementById('stage').getBoundingClientRect();
    const viewport=Frame.currentViewport(current()),x=board.x+point[0]*board.width/viewport.width,y=board.y+point[1]*board.height/viewport.height;
    if(!force&&x>stage.x+32&&x<stage.right-32&&y>stage.y+32&&y<stage.bottom-32)return;
    const view=Frame.view.get();Frame.view.set({...view,panX:view.panX+stage.x+stage.width/2-x,panY:view.panY+stage.y+stage.height/2-y});
  }
  function refresh() {
    const mark=Frame.feedback.selected();outline.replaceChildren();detail.hidden=!mark;
    if(!mark)return;
    const target=targetFor(mark),hasOriginal=snapshotAvailable(mark.revisionId),hasProposed=snapshotAvailable(mark.review?.revisionId);
    title.textContent=mark.text||'Drawn feedback';
    const state=mark.reviewedState||'state not recorded',viewport=mark.reviewedViewport;
    context.textContent=`${mark.elementAnchor?.elementId||'Position-only annotation'} · reviewed ${mark.revisionId||'unknown revision'} · ${state}${viewport?` · ${viewport.width} × ${viewport.height}`:''}`;
    proposal.hidden=!mark.review;
    proposal.textContent=mark.review?`${mark.review.decision==='accepted'?'Accepted':mark.review.decision==='reopened'?'Reopened':'Fix proposed'}: ${mark.review.summary}`:'';
    warning.textContent=[mark.needsReview?mark.reviewReason:'',mark.elementAnchor&&!target?'Target is hidden or removed in the current view.':'',!hasOriginal?'Original revision is unavailable.':'',mark.review&&!hasProposed?'Proposed revision is unavailable.':''].filter(Boolean).join(' ');
    original.disabled=!hasOriginal;compare.hidden=!mark.review;compare.disabled=!hasOriginal||!hasProposed;
    locate.disabled=!target&&!mark.anchor&&!mark.points?.length;
    if(target){
      const viewport=Frame.currentViewport(current());outline.setAttribute('viewBox',`0 0 ${viewport.width} ${viewport.height}`);
      const rect=document.createElementNS(outline.namespaceURI,'rect');
      for(const [key,value]of Object.entries(target.bounds))rect.setAttribute(key,String(value));
      rect.setAttribute('vector-effect','non-scaling-stroke');outline.append(rect);
    }
  }
  pin.addEventListener('click',()=>setPinned(!pinned));
  menu.addEventListener('toggle',()=>{if(pinned&&!menu.open)setPinned(false);refresh();});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&pinned){event.stopPropagation();setPinned(false);menu.open=false;menu.querySelector('summary').focus();}});
  document.getElementById('feedback-list').addEventListener('click',()=>locateTarget(false));
  locate.addEventListener('click',()=>locateTarget());
  original.addEventListener('click',()=>{
    const mark=Frame.feedback.selected();Frame.revisionReview.open(current(),{beforeRevisionId:mark.revisionId,afterRevisionId:mark.revisionId,viewport:mark.reviewedViewport,state:mark.reviewedState||'default'});
  });
  compare.addEventListener('click',()=>{
    const mark=Frame.feedback.selected();Frame.revisionReview.open(current(),{beforeRevisionId:mark.revisionId,afterRevisionId:mark.review.revisionId,viewport:mark.reviewedViewport,state:mark.reviewedState||'default'});
  });
  for(const event of ['frame:feedback-save-status','frame:design-selected','frame:design-updated'])window.addEventListener(event,refresh);
  try{setPinned(localStorage.getItem('frame-feedback-pinned')==='true');}catch{refresh();}
})();
