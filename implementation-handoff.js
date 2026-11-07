// Portable implementation context. Runtime verification is explicit reported evidence.
(function(root) {
  const model=root.FrameDocument||(typeof require==='function'?require('./design-document.js'):null);
  const copy=value=>JSON.parse(JSON.stringify(value));
  const text=value=>typeof value==='string'&&!!value.trim();
  const iso=value=>text(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
  function evidenceFor(doc) {
    const evidence=doc.metadata?.runtimeEvidence||[];
    if(!Array.isArray(evidence)||evidence.length>500)throw new Error('Runtime evidence must be an array of at most 500 records');
    const ids=new Set(doc.elements.map(node=>node.id));
    for(const entry of evidence){
      if(!entry||!ids.has(entry.elementId)||!text(entry.revisionId)||!text(entry.state)||
          !entry.viewport||![entry.viewport.width,entry.viewport.height].every(n=>Number.isInteger(n)&&n>0)||
          !['passed','failed'].includes(entry.result)||!iso(entry.checkedAt)||
          ['platform','applicationVersion','source','reference'].some(key=>!text(entry[key])||entry[key].length>2000)){
        throw new Error('Runtime evidence needs an element, exact revision/state/viewport, result, UTC date, platform, application version, source and reference');
      }
    }
    return evidence;
  }
  function create(doc,{viewport={width:doc.width,height:doc.height},state='default',feedback=[],values={}}={}) {
    model.validate(doc);
    if(!viewport||![viewport.width,viewport.height].every(n=>Number.isInteger(n)&&n>0)||!model.hasState(doc,state))throw new Error('Invalid handoff review context');
    state=model.resolveState(doc,viewport.width,state);
    const evidence=evidenceFor(doc),instances=Object.values(doc.componentLibrary?.instances||{});
    const components=copy(doc.componentLibrary||{definitions:{},instances:{}});
    const tokens=copy(model.tokens);
    for(const [category,value] of Object.entries(doc.tokens||{}))tokens[category]=value&&typeof value==='object'&&!Array.isArray(value)?{...tokens[category],...copy(value)}:value;
    const elements=model.inspect(doc,viewport,state).map(node=>{
      const instance=instances.find(instance=>instance.generatedIds?.includes(node.id));
      const records=evidence.filter(entry=>entry.elementId===node.id);
      const matching=records.filter(entry=>entry.revisionId===doc.revisionId&&entry.state===state&&entry.viewport.width===viewport.width&&entry.viewport.height===viewport.height)
        .sort((a,b)=>a.checkedAt.localeCompare(b.checkedAt));
      const latest=matching.at(-1);
      const interactive=node.type==='input'||node.action?.type==='set-state';
      return {id:node.id,type:node.type,parentId:node.parentId||null,text:node.text||'',label:node.label||null,bounds:copy(node.bounds),visible:node.visible!==false,
        style:copy(node.style||{}),layout:copy(Object.fromEntries(['responsive','breakpoints','flow','flowGrow','viewportLayout'].filter(key=>node[key]!==undefined).map(key=>[key,node[key]]))),...(node.type==='input'?{value:values[node.id]??node.value??node.text??''}:{}),...(node.assetId?{assetId:node.assetId}:{}),...(node.action?{action:copy(node.action)}:{}),
        component:instance?{definitionId:instance.componentId,instanceId:instance.id,localId:node.id.slice(instance.id.length+2),overrides:copy(instance.overrides||{})}:null,
        behavior:{kind:latest?.result==='passed'?'runtime-verified':interactive?'frame-interactive':'illustrated',
          prototype:interactive?'Frame input or declared state transition':'Visual representation',
          runtime:latest?copy(latest):null,otherEvidence:copy(records.filter(entry=>entry!==latest))}};
    });
    return {format:'frame-implementation-handoff',version:1,design:{id:doc.id,name:doc.name,revisionId:doc.revisionId,viewport:copy(viewport),state,values:copy(values)},
      tokens,components,assets:copy(doc.assets||[]),elements,feedback:copy(feedback),screens:copy(doc.views||[]),states:copy(doc.states||{}),viewportPresets:copy(doc.viewportPresets||[]),viewportLayouts:copy(doc.viewportLayouts||null),
      acceptance:['Check layout and typography in the target application.','Exercise the implemented controls and state transitions.','Confirm platform, application version and source for runtime checks.'],
      evidenceScope:'Runtime verification is reported evidence for the exact design revision, element, state and viewport. Frame does not authenticate or execute those external checks.'};
  }
  function markdown(report) {
    const esc=value=>String(value??'').replace(/[\\`*_{}\[\]<>|#]/g,'\\$&').replace(/[\r\n]+/g,' ');
    const {design}=report;
    const lines=[`# ${esc(design.name)} — implementation handoff`,'',`Design: ${esc(design.id)} · Revision: ${esc(design.revisionId)}`,
      `Viewport: ${design.viewport.width} × ${design.viewport.height} · State: ${esc(design.state)}`,'',report.evidenceScope,'','## Elements','',
      '| Element | Type / component | Bounds | Behavior |','| --- | --- | --- | --- |'];
    for(const node of report.elements){const b=node.bounds;lines.push(`| ${esc(node.id)}${node.visible?'':' (hidden)'} | ${esc(node.type)}${node.component?' / '+esc(node.component.definitionId):''} | ${b.x}, ${b.y}, ${b.width} × ${b.height} | ${esc(node.behavior.kind)} |`);}
    lines.push('','## Shared tokens','');
    for(const [category,values]of Object.entries(report.tokens))lines.push(`- ${esc(category)}: ${esc(JSON.stringify(values))}`);
    lines.push('','## Components and assets','',`Component definitions: ${Object.keys(report.components.definitions||{}).map(esc).join(', ')||'None'}`);
    for(const asset of report.assets)lines.push(`- Asset ${esc(asset.id)}: embedded image included in the JSON handoff.`);
    lines.push('','## Feedback','');
    for(const mark of report.feedback)lines.push(`- ${esc(mark.id)}: ${esc(mark.text||'Drawn annotation')} · ${esc(mark.review?.decision||mark.status||'open')}${mark.review?' · proposed revision '+esc(mark.review.revisionId):''}`);
    lines.push('','## Runtime evidence','');
    for(const node of report.elements)for(const entry of [node.behavior.runtime,...node.behavior.otherEvidence].filter(Boolean)){
      lines.push(`- ${esc(node.id)}: ${esc(entry.result)} · ${esc(entry.platform)} · ${esc(entry.applicationVersion)} · source ${esc(entry.source)} · ${esc(entry.checkedAt)} · ${esc(entry.reference)} · design ${esc(entry.revisionId)} / ${esc(entry.state)} / ${entry.viewport.width} × ${entry.viewport.height}`);
    }
    lines.push('','## Acceptance checks','',...report.acceptance.map(item=>'- [ ] '+item),'');return lines.join('\n');
  }
  const api={create,markdown};
  if(typeof module!=='undefined')module.exports=api;
  else {
    root.FrameHandoff=api;
    const report=id=>{
      const selected=document.getElementById('design-picker').value;
      if(id!==selected)throw new Error('Select the design before exporting its implementation context.');
      return create(Frame.agent.getDocument(id),{viewport:Frame.currentViewport(id),state:Frame.currentState(id),values:Frame.agent.getValues(id),feedback:id===selected?Frame.feedback.list():[]});
    };
    root.Frame.handoff={
      report,
      inspect:(id,elementId)=>{const node=report(id).elements.find(node=>node.id===elementId);if(!node)throw new Error('Unknown element: '+elementId);return node;},
      export:(id,{format='json'}={})=>{const value=report(id);if(format==='markdown')return markdown(value);if(format!=='json')throw new Error('Choose json or markdown');return JSON.stringify(value,null,2)+'\n';}
    };
  }
})(typeof window==='undefined'?globalThis:window);
