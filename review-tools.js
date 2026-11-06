(() => {
  const viewportPicker=document.getElementById("viewport-picker"),statePicker=document.getElementById("state-picker");
  const controls=document.getElementById("prototype-controls"),pins=new Map(),baselines=new Map();
  let designId=null,interaction=false;
  const configure=document.getElementById("configure-viewports"),dialog=document.getElementById("viewport-dialog");
  const sizes=document.getElementById("viewport-sizes"),sizeError=document.getElementById("viewport-error");
  const addSize=document.getElementById("add-viewport");
  const sizeKey=({width,height})=>width+"×"+height;
  let configuredId=null,renderedPresets="";
  function updateSizeButtons() {
    addSize.disabled=sizes.children.length>=16;
    for(const [i,row] of [...sizes.children].entries()) {
      row.querySelector("legend").textContent="Size "+(i+1);
      row.querySelector("button").disabled=sizes.children.length<=1;
    }
  }
  function addSizeRow(preset={name:"",width:"",height:""}) {
    const row=document.createElement("fieldset");
    row.innerHTML='<legend></legend><label>Name <input name="name" maxlength="60" required></label>'+
      '<label>Width <input name="width" type="number" min="1" max="8192" required></label>'+
      '<label>Height <input name="height" type="number" min="1" max="8192" required></label>'+
      '<button type="button" aria-label="Remove viewport size">Remove</button>';
    for(const input of row.querySelectorAll("input"))input.value=preset[input.name];
    row.querySelector("button").addEventListener("click",()=>{
      const adjacent=row.nextElementSibling||row.previousElementSibling;
      row.remove(); updateSizeButtons(); adjacent.querySelector("input").focus();
    });
    sizes.append(row);
    updateSizeButtons();
    return row;
  }
  configure.addEventListener("click",()=>{
    configuredId=designId;
    sizes.replaceChildren(); sizeError.textContent="";
    for(const preset of Frame.project.getViewportPresets(configuredId))addSizeRow(preset);
    dialog.showModal();
  });
  addSize.addEventListener("click",()=>addSizeRow().querySelector("input").focus());
  document.getElementById("cancel-viewports").addEventListener("click",()=>dialog.close());
  document.getElementById("viewport-form").addEventListener("submit",event=>{
    event.preventDefault();
    const presets=[...sizes.children].map(row=>Object.fromEntries([...row.querySelectorAll("input")].map(input=>
      [input.name,input.type==="number"?input.valueAsNumber:input.value])));
    try {Frame.project.setViewportPresets(configuredId,presets);dialog.close();}
    catch(error){sizeError.textContent=error.message;}
  });
  function structured(){return Frame.documents.has(designId);}
  function refresh(event) {
    if(Frame.restoringProject)return;
    const id=document.getElementById("design-picker").value;
    if(id!==designId){designId=id;pins.clear();controls.replaceChildren();}
    const enabled=structured();configure.disabled=viewportPicker.disabled=statePicker.disabled=!enabled;
    document.getElementById("tool-interact").disabled=!enabled;
    document.getElementById("check-design").disabled=!enabled;
    if(enabled) {
      const doc=Frame.agent.getDocument(designId);
      statePicker.replaceChildren(...Object.keys(doc.states||{default:{}}).map(state=>{const o=document.createElement("option");o.value=o.textContent=state;return o;}));
      statePicker.value=Frame.currentState(designId);
      const presets=Frame.project.getViewportPresets(designId),signature=JSON.stringify(presets);
      if(renderedPresets!==signature) {
        renderedPresets=signature;
        viewportPicker.replaceChildren(...presets.map(preset=>new Option(preset.name+" · "+preset.width+" × "+preset.height,sizeKey(preset))));
      }
      const current=Frame.currentViewport(designId);
      const matching=presets.find(preset=>sizeKey(preset)===sizeKey(current));
      const active=matching||presets[0];
      viewportPicker.value=sizeKey(active);
      if(!matching&&(event?.type==="frame:design-selected"||event?.type==="frame:project-restored")) {
        Frame.agent.setViewport(designId,{width:active.width,height:active.height});
        return;
      }
    } else {
      const design=Frame.designs.get(designId);
      const signature=design?sizeKey(design):"";
      if(renderedPresets!==signature) {
        renderedPresets=signature;
        viewportPicker.replaceChildren(...(design?[new Option(design.width+" × "+design.height,signature)]:[]));
      }
    }
    renderControls();
  }
  function renderControls() {
    controls.hidden=!interaction||!structured();
    if(!structured())return;
    const board=document.getElementById("board").getBoundingClientRect(),design=Frame.designs.get(designId);
    const nodes=Frame.agent.inspect(designId).filter(n=>["button","input"].includes(n.type)&&n.visible!==false);
    const live=new Set(nodes.map(n=>n.id));
    for(const [id,el]of pins)if(!live.has(id)){el.remove();pins.delete(id);}
    for(const node of nodes) {
      let el=pins.get(node.id);
      if(!el) {
        el=document.createElement(node.type==="input"?"input":"button");el.dataset.elementId=node.id;
        if(node.type==="button") {el.type="button";el.addEventListener("click",()=>{const current=Frame.agent.inspect(designId,{elementId:node.id})[0];if(current.action)Frame.agent.setState(designId,current.action.state);});}
        else {el.type="text";el.addEventListener("input",()=>Frame.agent.setValue(designId,node.id,el.value));}
        el.className="prototype-control";pins.set(node.id,el);controls.append(el);
      }
      el.setAttribute("aria-label",node.label);el.disabled=!!node.disabled;el.tabIndex=interaction&&!el.disabled?0:-1;
      if(node.type==="button")el.textContent=node.text||node.label;
      else if(document.activeElement!==el)el.value=node.value??node.text??"";
      const b=node.bounds,s=node.style,colors={...Frame.tokens.colors,...Frame.documents.get(designId).tokens?.colors};
      Object.assign(el.style,{left:b.x/design.width*100+"%",top:b.y/design.height*100+"%",width:b.width/design.width*100+"%",height:b.height/design.height*100+"%",
        fontSize:(s.fontSize||14)*board.width/design.width+"px",fontFamily:s.fontFamily||"monospace",color:colors[s.color]||s.color||colors.text,
        backgroundColor:colors[s.fill]||s.fill||colors.surface,borderColor:colors[s.stroke]||s.stroke||colors.border,opacity:s.opacity??1});
    }
  }
  function checks(id=designId) {
    const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
    const doc=Frame.agent.getDocument(id);
    return FrameReview.check(doc,Frame.agent.inspect(id),{viewport:Frame.currentViewport(id),measureText:(text,node)=>{
      ctx.font=(node.style.fontWeight||400)+" "+(node.style.fontSize||14)+"px "+(node.style.fontFamily||doc.tokens?.typography?.family||"monospace");return ctx.measureText(text).width;
    }});
  }
  function semantics() {
    if(!interaction||!structured())return {kind:"semantic",verified:false,reason:"Enable Interact on a structured design to check actual controls",issues:[]};
    const issues=[];
    for(const el of controls.querySelectorAll("button,input")) {
      if(!el.getAttribute("aria-label")?.trim())issues.push({elementId:el.dataset.elementId,type:"accessible-name"});
      if(!el.disabled&&el.tabIndex<0)issues.push({elementId:el.dataset.elementId,type:"keyboard-focus"});
    }
    return {kind:"semantic",verified:true,scope:"Names and keyboard focus of actual prototype controls; screen reader and full WCAG audits still require human testing",issues,
      focusOrder:[...controls.querySelectorAll("button,input")].filter(el=>!el.disabled).map(el=>el.dataset.elementId)};
  }
  async function pixels(id) {
    const image=await Frame.agent.exportImage({designId:id});
    const bitmap=await createImageBitmap(image.blob),canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext("2d");ctx.drawImage(bitmap,0,0);bitmap.close();
    return {width:canvas.width,height:canvas.height,pixels:ctx.getImageData(0,0,canvas.width,canvas.height).data};
  }
  function key(id,name){const size=Frame.currentViewport(id);return [id,name,size.width,size.height,Frame.currentState(id)].join(":");}
  Frame.review={
    check:checks,checkAccessibility:semantics,
    approve:async(id=designId,name="default")=>{const image=await pixels(id);baselines.set(key(id,name),image);return {approved:true,width:image.width,height:image.height};},
    compare:async(id=designId,{name="default",channelTolerance=12,maxChangedRatio=0.001}={})=>{
      if(!Number.isFinite(channelTolerance)||channelTolerance<0||channelTolerance>255||!Number.isFinite(maxChangedRatio)||maxChangedRatio<0||maxChangedRatio>1)throw new Error("Invalid visual comparison tolerance");
      const before=baselines.get(key(id,name));if(!before)throw new Error("Approve a baseline for this viewport/state first");
      const after=await pixels(id);let changed=0;
      for(let i=0;i<before.pixels.length;i+=4)if([0,1,2,3].some(c=>Math.abs(before.pixels[i+c]-after.pixels[i+c])>channelTolerance))changed++;
      const changedRatio=changed/(after.width*after.height);return {passed:changedRatio<=maxChangedRatio,changedPixels:changed,changedRatio,width:after.width,height:after.height,channelTolerance,maxChangedRatio};
    },
    run:async(id,scenarios)=>{
      if(!Array.isArray(scenarios))throw new Error("Scenarios must be an array");
      const results=[],oldViewport=Frame.currentViewport(id),oldState=Frame.currentState(id),oldValues=Frame.agent.getValues(id);
      try {for(const scenario of scenarios) {
        Frame.agent.setValues(id,oldValues);
        Frame.agent.setViewport(id,scenario.viewport||oldViewport);Frame.agent.setState(id,scenario.state||"default");
        for(const action of scenario.actions||[]) {
          const node=Frame.agent.inspect(id,{elementId:action.elementId})[0];
          if(!node||node.visible===false||node.disabled)throw new Error("Control is unavailable: "+action.elementId);
          if(action.type==="click"){if(node.type!=="button"||!node.action)throw new Error("Button cannot be activated: "+action.elementId);Frame.agent.setState(id,node.action.state);}
          else if(action.type==="input"){if(node.type!=="input")throw new Error("Not an input: "+action.elementId);Frame.agent.setValue(id,action.elementId,action.value);}else throw new Error("Unknown prototype action");}
        results.push({name:scenario.name||"scenario",revisionId:Frame.agent.getDocument(id).revisionId,viewport:Frame.currentViewport(id),interactionModel:"declarative prototype actions",state:Frame.currentState(id),passed:!scenario.expectedState||Frame.currentState(id)===scenario.expectedState,visual:checks(id)});
      }}finally{Frame.agent.setValues(id,oldValues);Frame.agent.setViewport(id,oldViewport);Frame.agent.setState(id,oldState);}
      return results;
    }
  };
  viewportPicker.addEventListener("change",()=>{
    if(!structured())return;
    const preset=Frame.project.getViewportPresets(designId).find(preset=>sizeKey(preset)===viewportPicker.value);
    if(preset)Frame.agent.setViewport(designId,{width:preset.width,height:preset.height});
  });
  statePicker.addEventListener("change",()=>Frame.agent.setState(designId,statePicker.value));
  document.getElementById("check-design").addEventListener("click",()=>{
    const result=checks();document.getElementById("review-report").textContent=result.issues.length?result.issues.map(i=>i.elementId+" · "+i.type+": "+i.message).join("\n"):"No structural issues found in this viewport/state.";
    document.getElementById("review-dialog").showModal();
  });
  document.getElementById("close-review").addEventListener("click",()=>document.getElementById("review-dialog").close());
  document.getElementById("download-image").addEventListener("click",async()=>{
    const status=document.getElementById("review-action-status");
    try {const image=await Frame.agent.exportImage({feedback:document.getElementById("image-feedback").checked});
      const url=URL.createObjectURL(image.blob),link=document.createElement("a");link.href=url;link.download=image.designId+"-"+(image.revisionId||"canvas")+".png";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent="";}
    catch(error){status.textContent="Image export failed: "+error.message;}
  });
  window.addEventListener("frame:feedback-mode",e=>{interaction=e.detail.mode==="interact";renderControls();});
  window.addEventListener("frame:design-selected",refresh);
  window.addEventListener("frame:design-updated",refresh);
  window.addEventListener('frame:project-restored',refresh);
  new ResizeObserver(renderControls).observe(document.getElementById("board"));
  refresh();
})();
