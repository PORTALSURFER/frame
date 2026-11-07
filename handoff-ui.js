(() => {
  const current=()=>document.getElementById('design-picker').value;
  const tools=document.querySelector('.feedback-tools'),stage=document.getElementById('stage'),board=document.getElementById('board');
  const button=document.createElement('button');button.id='tool-inspect';button.type='button';button.textContent='Inspect';button.setAttribute('aria-pressed','false');tools.append(button);
  const layer=document.createElementNS('http://www.w3.org/2000/svg','svg');layer.id='inspection-layer';layer.setAttribute('hidden','');layer.setAttribute('aria-label','Inspect design elements');board.append(layer);
  const floating=document.createElement('aside');floating.id='element-inspector';floating.hidden=true;floating.setAttribute('aria-label','Inspected element');
  const name=document.createElement('strong'),description=document.createElement('p'),openButton=document.createElement('button');
  openButton.type='button';openButton.textContent='Open implementation handoff';floating.append(name,description,openButton);stage.append(floating);
  const dialog=document.createElement('dialog');dialog.id='handoff-dialog';dialog.dataset.textEditor='';dialog.setAttribute('aria-labelledby','handoff-title');
  dialog.innerHTML=`<div class="review-heading"><h2 id="handoff-title">Implementation handoff</h2><button id="close-handoff" type="button">Close</button></div>
    <p id="handoff-context"></p><div class="handoff-layout"><label>Element<select id="handoff-element" data-preview-picker></select></label><section><h3 id="handoff-element-title"></h3><dl id="handoff-properties"></dl></section></div>
    <details><summary>Shared tokens</summary><pre id="handoff-tokens"></pre></details><p id="handoff-assets"></p>
    <p class="guide-hint">Illustrated elements describe appearance. Frame interactions exercise prototype inputs and declared state changes. Runtime verification requires recorded evidence for this exact revision, element, state and viewport.</p>
    <div class="handoff-actions"><button id="download-handoff-json" type="button">Download JSON with assets</button><button id="download-handoff-md" type="button">Download Markdown brief</button></div><p id="handoff-status" role="status"></p>`;
  document.body.append(dialog);
  const get=id=>dialog.querySelector('#'+id),picker=get('handoff-element');
  let active=false,selected=null,report=null;
  function setActive(next) {
    active=next;stage.dataset.inspectionMode=String(active);button.setAttribute('aria-pressed',String(active));
    layer.toggleAttribute('hidden',!active);floating.hidden=!active||!selected;
    if(active)document.getElementById('active-tool').textContent='Inspect';
    refreshSelection();
  }
  function behavior(node) {
    if(node.behavior.runtime?.result==='failed')return 'Runtime check failed · recorded evidence';
    return node.behavior.kind==='runtime-verified'?'Runtime verified · recorded evidence':node.behavior.kind==='frame-interactive'?'Interactive in Frame':'Illustrated';
  }
  function refreshSelection() {
    layer.replaceChildren();if(!active||!Frame.documents.has(current()))return;
    const node=selected&&Frame.agent.inspect(current(),{elementId:selected})[0];
    if(!node){selected=null;floating.hidden=true;return;}
    floating.hidden=false;name.textContent=node.id;
    try {
      const info=Frame.handoff.inspect(current(),selected),b=info.bounds;
      description.textContent=`${info.type}${info.component?' · '+info.component.definitionId:''} · ${b.width} × ${b.height} at ${b.x}, ${b.y}. ${behavior(info)}.`;
    } catch(error){description.textContent=error.message;}
    const viewport=Frame.currentViewport(current());layer.setAttribute('viewBox',`0 0 ${viewport.width} ${viewport.height}`);
    const rect=document.createElementNS(layer.namespaceURI,'rect');
    for(const [key,value]of Object.entries(node.bounds))rect.setAttribute(key,String(value));
    rect.setAttribute('vector-effect','non-scaling-stroke');layer.append(rect);
  }
  function showProperties() {
    const node=report?.elements.find(node=>node.id===picker.value);if(!node)return;
    selected=node.id;get('handoff-element-title').textContent=node.label||node.text||node.id;
    const b=node.bounds,rows=[['Element ID',node.id],['Type',node.type],['Parent',node.parentId||'Canvas'],['Bounds',`${b.x}, ${b.y} · ${b.width} × ${b.height}`],
      ['Component',node.component?`${node.component.definitionId} / ${node.component.instanceId} / ${node.component.localId}`:'Independent element'],['Behavior',behavior(node)],
      ['Style',JSON.stringify(node.style)],['Action',node.action?JSON.stringify(node.action):'No declared state transition'],
      ['Runtime evidence',node.behavior.runtime?JSON.stringify(node.behavior.runtime):'No matching runtime evidence recorded']];
    const list=get('handoff-properties');list.replaceChildren();
    for(const [label,value]of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);}
    refreshSelection();
  }
  function show() {
    get('handoff-status').textContent='';
    try {
      report=Frame.handoff.report(current());
      get('handoff-context').textContent=`${report.design.name} · ${report.design.revisionId} · ${report.design.viewport.width} × ${report.design.viewport.height} · ${report.design.state}`;
      picker.replaceChildren(...report.elements.map(node=>new Option(`${node.id} · ${node.type}`,node.id)));
      picker.value=report.elements.some(node=>node.id===selected)?selected:report.elements[0]?.id||'';
      get('handoff-tokens').textContent=JSON.stringify(report.tokens,null,2);
      get('handoff-assets').textContent=`${Object.keys(report.components.definitions||{}).length} component definitions · ${report.assets.length} embedded assets. JSON includes resolved elements, shared tokens, definitions, instances, feedback and image data.`;
      showProperties();document.querySelector('.project-menu').open=false;if(!dialog.open)dialog.showModal();
    }catch(error){
      report=null;picker.replaceChildren();get('handoff-properties').replaceChildren();get('handoff-element-title').textContent='';
      get('handoff-context').textContent='';get('handoff-tokens').textContent='';get('handoff-assets').textContent='';
      get('handoff-status').textContent=error.message;if(!dialog.open)dialog.showModal();
    }
    for(const id of ['download-handoff-json','download-handoff-md'])get(id).disabled=!report;
  }
  function download(format) {
    try {
      const data=Frame.handoff.export(current(),{format}),doc=Frame.agent.getDocument(current());
      const url=URL.createObjectURL(new Blob([data],{type:format==='json'?'application/json':'text/markdown'})),link=document.createElement('a');
      link.href=url;link.download=`${doc.id}-${doc.revisionId}-handoff.${format==='json'?'json':'md'}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      get('handoff-status').textContent='Handoff downloaded for '+doc.revisionId;
    }catch(error){get('handoff-status').textContent=error.message;}
  }
  button.addEventListener('click',()=>{const next=!active;Frame.view.setMode('select');setActive(next);});
  window.addEventListener('frame:feedback-mode',()=>setActive(false));
  layer.addEventListener('pointerdown',event=>{
    event.preventDefault();const rect=layer.getBoundingClientRect(),viewport=Frame.currentViewport(current());
    const hit=Frame.agent.hitTest(current(),(event.clientX-rect.left)*viewport.width/rect.width,(event.clientY-rect.top)*viewport.height/rect.height)[0];
    selected=hit?.id||null;refreshSelection();
  });
  openButton.addEventListener('click',show);document.getElementById('inspect-design').addEventListener('click',show);
  picker.addEventListener('change',showProperties);get('close-handoff').addEventListener('click',()=>dialog.close());
  get('download-handoff-json').addEventListener('click',()=>download('json'));get('download-handoff-md').addEventListener('click',()=>download('markdown'));
  function refresh(){const enabled=Frame.documents.has(current());button.disabled=document.getElementById('inspect-design').disabled=!enabled;if(!enabled)setActive(false);else refreshSelection();if(dialog.open)show();}
  window.addEventListener('frame:design-selected',()=>{selected=null;setActive(false);if(dialog.open)dialog.close();refresh();});
  window.addEventListener('frame:design-updated',refresh);refresh();
})();
