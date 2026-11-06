// Serializable design documents and atomic editing, shared by the browser and Node.
(function(root) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const types = new Set(["container", "text", "button", "input", "line", "chart", "image"]);
  const finite = Number.isFinite;
  const fail = message => { throw new Error(message); };
  const validId = value => typeof value === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(value);
  const colors = {background: "#0D0F10", surface: "#121314", text: "#D5D8D6", muted: "#868C8A", accent: "#E86938", border: "#3E4443"};
  const tokens = {colors, spacing: {small: 8, medium: 16, large: 24}, typography: {family: "monospace", size: 14}};
  function viewportLayout(doc, width) {
    return doc.viewportLayouts && (width<=doc.viewportLayouts.maxWidth?"narrow":"wide");
  }
  function stateEntries(doc) {
    return doc.views
      ? doc.views.flatMap(view => view.contexts.map(context => [context.id, context.overrides]))
      : Object.entries(doc.states || {default: {}});
  }
  function hasState(doc, state) {
    return doc.views
      ? doc.views.some(view => view.contexts.some(context => context.id === state))
      : Object.hasOwn(doc.states || {default: {}}, state);
  }
  function viewportStates(doc, width) {
    const layout=viewportLayout(doc,width);
    return layout ? doc.viewportLayouts[layout] : stateEntries(doc).map(([id]) => id);
  }
  function viewportViews(doc, width) {
    const available = new Set(viewportStates(doc, width));
    return (doc.views || []).map(({id, label, contexts}) => ({
      id, label, contexts: contexts.filter(context => available.has(context.id)).map(({id, label}) => ({id, label}))
    })).filter(view => view.contexts.length);
  }
  function resolveState(doc, width, state) {
    const mode = viewportLayout(doc, width);
    if (!mode || doc.viewportLayouts[mode].includes(state)) return state;
    const view = doc.views?.find(view => view.contexts.some(context => context.id === state));
    return view?.contexts.find(context => doc.viewportLayouts[mode].includes(context.id))?.id || "default";
  }
  function validate(doc) {
    if (!doc || doc.version !== 1 || !validId(doc.id) || typeof doc.name !== "string" || !doc.name.trim() ||
        ![doc.width, doc.height].every(value => Number.isInteger(value) && value > 0) ||
        !validId(doc.revisionId) || !Array.isArray(doc.elements)) fail("Expected a version 1 design with id, name, positive integer size, revisionId, and elements");
    if (doc.views !== undefined) {
      if (doc.states !== undefined || !Array.isArray(doc.views) || !doc.views.length) fail("Design views replace the flat states map");
      const viewIds = new Set(), contextIds = new Set();
      const named = entry => entry && validId(entry.id) && typeof entry.label === "string" && entry.label.trim();
      for (const view of doc.views) {
        if (!named(view) || viewIds.has(view.id) || !Array.isArray(view.contexts) || !view.contexts.length) fail("Invalid design view");
        viewIds.add(view.id);
        for (const context of view.contexts) {
          if (!named(context) || contextIds.has(context.id)) fail("Invalid or duplicate view context");
          contextIds.add(context.id);
        }
      }
      if (!contextIds.has("default")) fail("View contexts require a default entry");
    } else if (doc.states !== undefined && (!doc.states || typeof doc.states !== "object" || Array.isArray(doc.states) || !Object.hasOwn(doc.states, "default"))) {
      fail("States require a default entry");
    }
    const states = stateEntries(doc);
    const stateIds = new Set(states.map(([id]) => id));
    if (doc.viewportLayouts!==undefined) {
      const layouts=doc.viewportLayouts;
      const validStates=states=>Array.isArray(states)&&states.includes("default")&&
        new Set(states).size===states.length&&states.every(state=>stateIds.has(state));
      if (!layouts||!Number.isInteger(layouts.maxWidth)||layouts.maxWidth<1||
          !validStates(layouts.narrow)||!validStates(layouts.wide)) fail("Invalid viewport layouts");
    }
    if (doc.elements.length > 10000) fail("Design exceeds the 10,000-element limit");
    const ids = new Set();
    for (const node of doc.elements) {
      if (!node || !validId(node.id) || ids.has(node.id) || !types.has(node.type)) fail("Element IDs must be unique and element types must be supported");
      ids.add(node.id);
      if (node.viewportLayout!==undefined&&(!doc.viewportLayouts||!["narrow","wide"].includes(node.viewportLayout))) fail(node.id+": invalid viewport layout");
      if (!node.bounds || !["x", "y", "width", "height"].every(key => finite(node.bounds[key])) || node.bounds.width < 0 || node.bounds.height < 0) fail(node.id + ": invalid bounds");
      if (node.text !== undefined && typeof node.text !== "string") fail(node.id + ": text must be a string");
      if (node.flowGrow !== undefined && (!finite(node.flowGrow) || node.flowGrow < 0)) fail(node.id + ": invalid flowGrow");
      if (node.flow !== undefined) {
        const f=node.flow;
        if (node.type !== "container" || !f || !["row","column","wrap","grid"].includes(f.kind) ||
            (f.gap !== undefined && !(finite(f.gap) && f.gap >= 0) && !(typeof f.gap === "string" && finite(doc.tokens?.spacing?.[f.gap]) && doc.tokens.spacing[f.gap] >= 0)) ||
            (f.kind === "grid" && (!Number.isInteger(f.columns) || f.columns < 1 || f.columns > 128))) fail(node.id + ": invalid flow");
      }
      if (node.style && (typeof node.style !== "object" || Array.isArray(node.style))) fail(node.id + ": invalid style");
      for (const key of ["fontSize", "lineWidth", "radius", "cutCorner", "opacity"]) if (node.style?.[key] !== undefined && !finite(node.style[key])) fail(node.id + ": invalid " + key);
      if (node.points && (!Array.isArray(node.points) || !node.points.every(point => Array.isArray(point) && point.length === 2 && point.every(finite)))) fail(node.id + ": invalid points");
      for (const layout of [node.responsive, ...(node.breakpoints || []).map(item => item.bounds)].filter(Boolean)) {
        for (const [key, value] of Object.entries(layout)) if (!["x", "y", "width", "height"].includes(key) || !(finite(value) || typeof value === "string" && /^-?\d+(\.\d+)?%$/.test(value))) fail(node.id + ": invalid responsive bounds");
      }
      if (node.breakpoints && (!Array.isArray(node.breakpoints) || !node.breakpoints.every(item => finite(item.maxWidth) && item.maxWidth > 0 && item.bounds))) fail(node.id + ": invalid breakpoints");
      if (["button", "input"].includes(node.type) && (typeof node.label !== "string" || !node.label.trim())) fail(node.id + ": controls need an accessible label");
      if (node.action && (node.action.type !== "set-state" || !validId(node.action.state))) fail(node.id + ": unsupported action");
    }
    const byId = new Map(doc.elements.map(node => [node.id, node]));
    for (const node of doc.elements) {
      if (node.flowGrow && !["row", "column"].includes(byId.get(node.parentId)?.flow?.kind)) fail(node.id + ": flowGrow requires a row or column parent");
      let parent = node.parentId;
      const seen = new Set([node.id]);
      while (parent !== undefined && parent !== null) {
        if (!byId.has(parent)) fail(node.id + ": missing parent " + parent);
        if (seen.has(parent)) fail(node.id + ": hierarchy cycle");
        seen.add(parent);
        if (byId.get(parent).type !== "container") fail(node.id + ": parent must be a container");
        parent = byId.get(parent).parentId;
      }
      if (node.action && !stateIds.has(node.action.state)) fail(node.id + ": unknown action state");
    }
    for (const [state, overrides] of states) {
      if (!validId(state) || !overrides || typeof overrides !== "object" || Array.isArray(overrides)) fail("Invalid state");
      for (const [elementId, override] of Object.entries(overrides)) {
        if (!byId.has(elementId) || !override || typeof override !== "object" || Array.isArray(override) ||
            Object.keys(override).some(key => !["text", "visible", "disabled", "value", "style"].includes(key))) fail("Invalid state override for " + elementId);
        if (override.text !== undefined && typeof override.text !== "string") fail("State text must be a string");
        for (const key of ["visible", "disabled"]) if (override[key] !== undefined && typeof override[key] !== "boolean") fail("Invalid state " + key);
      }
    }
    if (doc.assets && (!Array.isArray(doc.assets) || !doc.assets.every(asset => validId(asset.id) && typeof asset.data === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(asset.data)))) fail("Assets must be embedded PNG, JPEG, or WebP data URLs");
    const assetIds=new Set();
    for(const asset of doc.assets||[]) {if(assetIds.has(asset.id))fail("Duplicate asset ID");assetIds.add(asset.id);}
    for(const node of doc.elements)if(node.type==="image"&&!assetIds.has(node.assetId))fail(node.id+": missing image asset");
    return doc;
  }
  const imageCache=new Map();
  function ensureImage(data) {
    if(imageCache.has(data))return imageCache.get(data);
    const image=new Image();image.src=data;
    const promise=image.decode();promise.catch(()=>{});
    const entry={image,promise};imageCache.set(data,entry);return entry;
  }
  function prepareAssets(doc) {
    return Promise.all(doc.elements.filter(node=>node.type==="image").map(node=>ensureImage(doc.assets.find(asset=>asset.id===node.assetId).data).promise));
  }
  function layout(doc, viewport = {width: doc.width, height: doc.height}, state = "default") {
    if (!hasState(doc, state)) fail("Unknown state: " + state);
    const width = viewport.width, height = viewport.height;
    if (![width, height].every(value => Number.isInteger(value) && value > 0)) fail("Viewport needs positive integer dimensions");
    const viewportMode=viewportLayout(doc,width);
    const activeState = resolveState(doc, width, state);
    const stateOverrides = doc.views
      ? stateEntries(doc).find(([id]) => id === activeState)[1]
      : doc.states?.[activeState];
    const matchesViewport=node=>!node.viewportLayout||node.viewportLayout===viewportMode;
    const resolved = new Map();
    const byId = new Map(doc.elements.map(node => [node.id, node]));
    const childrenByParent = new Map();
    for (const node of doc.elements) if (node.parentId) { const siblings = childrenByParent.get(node.parentId) || []; siblings.push(node); childrenByParent.set(node.parentId, siblings); }
    const flowCache = new Map();
    function slots(parent, frame) {
      if (flowCache.has(parent.id)) return flowCache.get(parent.id);
      const flow=parent.flow, gap=typeof flow.gap === "string" ? doc.tokens.spacing[flow.gap] : (flow.gap ?? 4);
      const children=(childrenByParent.get(parent.id)||[]).filter(n=>matchesViewport(n) && n.visible!==false && stateOverrides?.[n.id]?.visible!==false);
      const size=(n,reference=frame)=>{
        const b={...n.bounds}, patch={...n.responsive};
        for(const bp of [...(n.breakpoints||[])].sort((a,b)=>b.maxWidth-a.maxWidth)) if(width<=bp.maxWidth)Object.assign(patch,bp.bounds);
        for(const [k,v] of Object.entries(patch)) b[k]=typeof v==='string'?parseFloat(v)/100*reference[["x","width"].includes(k)?"width":"height"]:v;
        return b;
      };
      const out=new Map();let x=0,y=0,lineHeight=0;
      if(flow.kind==='grid'){
        const cw=Math.max(0,(frame.width-gap*(flow.columns-1))/flow.columns);
        for(let start=0;start<children.length;start+=flow.columns){
          const row=children.slice(start,start+flow.columns), sizes=row.map(n=>size(n,{...frame,width:cw})), rh=Math.max(0,...sizes.map(b=>b.height));
          row.forEach((n,i)=>out.set(n.id,{x:i*(cw+gap),y,width:sizes[i].width,height:sizes[i].height}));y+=rh+gap;
        }
      } else {
       const vertical=flow.kind==='column', axis=vertical?'height':'width';
       const maxGrow=Math.max(0,...children.map(n=>n.flowGrow||0));
       const totalGrow=children.reduce((sum,n)=>sum+(maxGrow?(n.flowGrow||0)/maxGrow:0),0);
       const fixed=children.reduce((sum,n)=>sum+(n.flowGrow?0:size(n)[axis]),0);
       const free=Math.max(0,frame[axis]-fixed-gap*Math.max(0,children.length-1));
       for(const child of children){
        const b=size(child);if(child.flowGrow)b[axis]=free*(child.flowGrow/maxGrow)/totalGrow;
        if(flow.kind==='wrap' && x>0 && x+b.width>frame.width){x=0;y+=lineHeight+gap;lineHeight=0;}
        out.set(child.id,{x,y,width:b.width,height:b.height});
        if(flow.kind==='column')y+=b.height+gap;else {x+=b.width+gap;lineHeight=Math.max(lineHeight,b.height);}
       }
      }
      flowCache.set(parent.id,out);return out;
    }
    function resolve(node) {
      if (resolved.has(node.id)) return resolved.get(node.id);
      const parent = node.parentId ? resolve(byId.get(node.parentId)) : null;
      const frame = parent?.bounds || {x: 0, y: 0, width, height};
      const overrides = stateOverrides?.[node.id] || {};
      const patch = {...node.responsive};
      for (const breakpoint of [...(node.breakpoints || [])].sort((a, b) => b.maxWidth - a.maxWidth)) if (width <= breakpoint.maxWidth) Object.assign(patch, breakpoint.bounds);
      const bounds = {...node.bounds};
      for (const [key, value] of Object.entries(patch)) bounds[key] = typeof value === "string" ? parseFloat(value) / 100 * frame[["x", "width"].includes(key) ? "width" : "height"] : value;
      if (node.parentId && byId.get(node.parentId)?.flow) Object.assign(bounds, slots(byId.get(node.parentId), frame).get(node.id) || {});
      bounds.x += frame.x; bounds.y += frame.y;
      const result = {...node, ...overrides, style: {...node.style, ...overrides.style}, bounds,
        visible: matchesViewport(node) && node.visible !== false && overrides.visible !== false && (!parent || parent.visible)};
      resolved.set(node.id, result);
      return result;
    }
    return doc.elements.map(resolve);
  }
  function hitTest(elements, x, y) {
    return [...elements].reverse().filter(node => node.visible !== false && x >= node.bounds.x && y >= node.bounds.y &&
      x <= node.bounds.x + node.bounds.width && y <= node.bounds.y + node.bounds.height);
  }
  function edit(doc, operations) {
    if (!Array.isArray(operations)) fail("Operations must be an array");
    const next = clone(doc);
    for (const operation of operations) {
      const index = next.elements.findIndex(node => node.id === operation.id);
      if (operation.op === "create") {
        if (!operation.element || next.elements.some(node => node.id === operation.element.id)) fail("Cannot create duplicate or missing element");
        next.elements.push(clone(operation.element));
      } else if (operation.op === "update") {
        if (index < 0 || !operation.patch || Object.hasOwn(operation.patch, "id")) fail("Update needs an existing ID and cannot change it");
        const node = next.elements[index];
        next.elements[index] = {...node, ...clone(operation.patch), bounds: {...node.bounds, ...operation.patch.bounds}, style: {...node.style, ...operation.patch.style}};
      } else if (operation.op === "remove") {
        if (index < 0) fail("Cannot remove unknown element");
        const removed = new Set([operation.id]);
        let changed = true;
        while (changed) { changed = false; for (const node of next.elements) if (removed.has(node.parentId) && !removed.has(node.id)) { removed.add(node.id); changed = true; } }
        next.elements = next.elements.filter(node => !removed.has(node.id));
        for (const [, overrides] of stateEntries(next)) for (const id of removed) delete overrides[id];
      } else fail("Unknown operation: " + operation.op);
    }
    next.revisionId = "r-" + crypto.randomUUID();
    return validate(next);
  }
  function component(type, id, bounds, options = {}) {
    return {id, type, bounds: {...bounds}, ...options, ...(type === "button" || type === "input" ? {label: options.label || options.text || id} : {})};
  }
  const components = Object.fromEntries([...types].map(type => [type, (id, bounds, options) => component(type, id, bounds, options)]));
  function render(ctx, doc, options = {}) {
    const elements = layout(doc, options.viewport, options.state);
    const sources = new Map(doc.elements.map(node => [node.id, node]));
    const palette = {...colors, ...doc.tokens?.colors};
    ctx.fillStyle = doc.background || palette.background;
    ctx.fillRect(0, 0, options.viewport?.width || doc.width, options.viewport?.height || doc.height);
    for (const node of elements) {
      if (!node.visible) continue;
      const b = node.bounds, s = node.style || {};
      ctx.save();
      ctx.globalAlpha = s.opacity ?? 1;
      ctx.lineWidth = s.lineWidth ?? 1;
      ctx.strokeStyle = palette[s.stroke] || s.stroke || palette.border;
      ctx.fillStyle = palette[s.fill] || s.fill || palette.surface;
      if (["container", "button", "input"].includes(node.type)) {
        ctx.beginPath();
        const radius = Math.max(0, Math.min(s.radius || 0, b.width / 2, b.height / 2));
        const cut = Math.max(0, Math.min(s.cutCorner || 0, b.width / 2, b.height / 2));
        if (node.points) {
          node.points.forEach(([x,y],i)=>ctx[i?"lineTo":"moveTo"](b.x+x,b.y+y));ctx.closePath();
        } else if (cut) {
          const x=b.x,y=b.y,right=x+b.width,bottom=y+b.height,r=Math.min(radius,cut);
          ctx.moveTo(x+r,y);ctx.lineTo(right-r,y);ctx.quadraticCurveTo(right,y,right,y+r);
          ctx.lineTo(right,bottom-cut);ctx.lineTo(right-cut,bottom);ctx.lineTo(x+r,bottom);
          ctx.quadraticCurveTo(x,bottom,x,bottom-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
        } else ctx.roundRect(b.x,b.y,b.width,b.height,radius);
        if (s.fillTop && s.fillBottom) {
          const gradient=ctx.createLinearGradient(0,b.y,0,b.y+b.height);
          gradient.addColorStop(0,palette[s.fillTop]||s.fillTop);gradient.addColorStop(1,palette[s.fillBottom]||s.fillBottom);
          ctx.fillStyle=gradient;
        }
        if (s.fill !== "none") ctx.fill();
        if (s.stroke !== "none") ctx.stroke();
      }
      if(node.type==="image") {
        const asset=doc.assets.find(asset=>asset.id===node.assetId);
        const entry=ensureImage(asset.data);
        if(entry.image.complete&&entry.image.naturalWidth)ctx.drawImage(entry.image,b.x,b.y,b.width,b.height);
      }
      if (["line", "chart"].includes(node.type)) {
        ctx.beginPath();
        const points = node.points || [[0, 0], [b.width, b.height]];
        const source = sources.get(node.id).bounds;
        const scaleX = node.type === "chart" ? b.width / (source.width || 1) : 1;
        const scaleY = node.type === "chart" ? b.height / (source.height || 1) : 1;
        points.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](b.x + x * scaleX, b.y + y * scaleY)); ctx.stroke();
      }
      if (node.text !== undefined || node.type === "input") {
        ctx.fillStyle = palette[s.color] || s.color || palette.text;
        ctx.font = `${s.fontWeight || 400} ${s.fontSize || doc.tokens?.typography?.size || 14}px ${s.fontFamily || doc.tokens?.typography?.family || "monospace"}`;
        ctx.textBaseline = "top"; ctx.textAlign = s.textAlign || "left";
        const padding = s.padding ?? (["button", "input"].includes(node.type) ? 8 : 0);
        const x = s.textAlign === "center" ? b.x + b.width / 2 : s.textAlign === "right" ? b.x + b.width - padding : b.x + padding;
        const content = node.type === "input" ? options.values?.[node.id] ?? node.value ?? node.text ?? "" : node.text || "";
        const lines = String(content).split("\n");
        if (s.verticalAlign === "middle" && lines.length === 1) {
          ctx.textBaseline = "alphabetic";
          const metrics = ctx.measureText(lines[0]);
          const ascent = metrics.actualBoundingBoxAscent ?? (s.fontSize || 14) * 0.8;
          const descent = metrics.actualBoundingBoxDescent ?? (s.fontSize || 14) * 0.2;
          ctx.textBaseline = "alphabetic";
          ctx.fillText(lines[0], x, b.y + (b.height + ascent - descent) / 2);
        } else lines.forEach((line, i) => ctx.fillText(line, x, b.y + padding + i * (s.lineHeight || (s.fontSize || 14) * 1.4)));
      }
      ctx.restore();
    }
    return elements;
  }
  function inspect(doc, viewport, state) {
    const children = new Map();
    for (const node of doc.elements) {
      if (!node.parentId) continue;
      if (!children.has(node.parentId)) children.set(node.parentId, []);
      children.get(node.parentId).push(node.id);
    }
    return layout(doc, viewport, state).map(node => ({...node, children: children.get(node.id) || []}));
  }
  const api = {prepareAssets, validate, layout, hitTest, edit, render, inspect, components, tokens, clone,
    viewportLayout, viewportStates, viewportViews, stateEntries, hasState, resolveState};
  if (typeof module !== "undefined") module.exports = api; else root.FrameDocument = api;
})(typeof window === "undefined" ? globalThis : window);
