// Linked, document-owned component definitions and instances for structured designs.
// Generated element IDs remain stable, so feedback can stay anchored across edits.
(function(root) {
  const copy = value => JSON.parse(JSON.stringify(value));
  const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]*$/i.test(value);
  const fail = message => { throw new Error(message); };
  function library(doc) {
    return doc.componentLibrary ||= {definitions: {}, instances: {}};
  }
  function validateOverrides(overrides, partIds) {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) fail('Invalid instance overrides');
    for (const [part, patch] of Object.entries(overrides)) {
      if (!partIds.has(part) || !patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(k => !['text','style','visible','disabled','value','points','bounds'].includes(k))) fail('Invalid instance override');
    }
  }
  function validateDefinition(definition) {
    if (!definition || !validId(definition.id) || !Array.isArray(definition.elements) || !definition.elements.length)
      fail('A component needs an ID and at least one element');
    const ids = new Set();
    for (const node of definition.elements) {
      if (!validId(node.id) || ids.has(node.id)) fail('Component element IDs must be unique');
      ids.add(node.id);
    }
    for (const node of definition.elements) if (node.parentId && !ids.has(node.parentId)) fail('Component parent is missing');
    if (definition.variants !== undefined) {
      if (!definition.variants || typeof definition.variants !== 'object' || Array.isArray(definition.variants)) fail('Invalid component variants');
      for (const [name, overrides] of Object.entries(definition.variants)) {
        if (!validId(name)) fail('Invalid variant name');
        validateOverrides(overrides, ids);
      }
    }
    return copy(definition);
  }
  function expand(instance, definition) {
    if (!validId(instance.id) || !validId(instance.componentId) || !Number.isFinite(instance.x) || !Number.isFinite(instance.y)) fail('Invalid component instance');
    const overrides = instance.overrides || {};
    const partIds = new Set(definition.elements.map(node => node.id));
    validateOverrides(overrides, partIds);
    if (instance.variant !== undefined && !Object.hasOwn(definition.variants || {}, instance.variant)) fail('Unknown component variant');
    const variant = definition.variants?.[instance.variant] || {};
    return definition.elements.map(part => {
      const node = copy(part), base = variant[part.id] || {}, own = overrides[part.id] || {};
      const patch = {...base, ...own};
      if (base.style || own.style) patch.style = {...base.style, ...own.style};
      if (base.bounds || own.bounds) patch.bounds = {...base.bounds, ...own.bounds};
      node.id = instance.id + '--' + part.id;
      if (patch.bounds) node.bounds = {...node.bounds, ...patch.bounds};
      if (node.parentId) node.parentId = instance.id + '--' + node.parentId;
      else { node.bounds.x += instance.x; node.bounds.y += instance.y; }
      const result={...node, ...copy(patch), bounds:node.bounds};
      if (patch.style) result.style={...node.style,...patch.style};
      return result;
    });
  }
  function rebuild(doc, instanceId) {
    const lib = library(doc), instance = lib.instances[instanceId], definition = lib.definitions[instance?.componentId];
    if (!instance || !definition) fail('Unknown instance or component');
    if (!Array.isArray(instance.generatedIds) || instance.generatedIds.some(id => typeof id !== 'string' || !id.startsWith(instance.id + '--'))) fail('Invalid generated element IDs');
    const oldIds = new Set(instance.generatedIds), first = doc.elements.findIndex(node => oldIds.has(node.id));
    const generated = expand(instance, definition), remaining = doc.elements.filter(node => !oldIds.has(node.id));
    const ids = new Set(remaining.map(node => node.id));
    if (generated.some(node => ids.has(node.id))) fail('Instance element ID conflicts with an existing element');
    const nextIds = new Set(generated.map(node => node.id));
    for (const state of Object.values(doc.states || {})) for (const id of oldIds) if (!nextIds.has(id) && Object.hasOwn(state,id)) fail('Component edit would orphan a state override');
    if (doc.elements.some(node => !oldIds.has(node.id) && oldIds.has(node.parentId) && !nextIds.has(node.parentId))) fail('Component edit would orphan a child');
    remaining.splice(first < 0 ? remaining.length : first, 0, ...generated);
    doc.elements = remaining; instance.generatedIds = generated.map(node => node.id);
  }
  function define(doc, definition) {
    const next=copy(doc), def=validateDefinition(definition), lib=library(next);
    lib.definitions[def.id]=def;
    for (const id of Object.keys(lib.instances)) if (lib.instances[id].componentId===def.id) rebuild(next,id);
    return next;
  }
  function instantiate(doc, instance) {
    const next=copy(doc), lib=library(next), item=copy(instance);
    if (!item || !validId(item.id) || lib.instances[item.id]) fail('Instance ID must be unique');
    if (!lib.definitions[item.componentId]) fail('Unknown component');
    item.generatedIds=[]; lib.instances[item.id]=item; rebuild(next,item.id); return next;
  }
  function override(doc, id, overrides) {
    const next=copy(doc), item=library(next).instances[id]; if (!item) fail('Unknown instance');
    item.overrides=copy(overrides); rebuild(next,id); return next;
  }
  const api={define, instantiate, override};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  if (root.Frame?.agent) {
    const commit=(id,op,...args)=>{const doc=op(root.Frame.agent.getDocument(id),...args);doc.revisionId='r-'+crypto.randomUUID();return root.Frame.agent.updateDocument(doc);};
    root.Frame.layoutTokens={publish:(changes,designIds)=>{
      if (!changes || typeof changes !== 'object' || Array.isArray(changes) || !Object.keys(changes).length || Object.entries(changes).some(([key,value])=>!validId(key)||!Number.isFinite(value)||value<0)) fail('Invalid spacing tokens');
      if (!Array.isArray(designIds) || !designIds.length || new Set(designIds).size !== designIds.length) fail('Specify unique target designs');
      const candidates=designIds.map(id=>{const next=root.Frame.agent.getDocument(id);next.tokens||={};next.tokens.spacing={...next.tokens.spacing,...changes};next.revisionId='r-'+crypto.randomUUID();root.FrameDocument.validate(next);root.Frame.validateRevision?.(next);return next;});
      return candidates.map(doc=>root.Frame.agent.updateDocument(doc));
    }};
    root.Frame.componentInstances={
      document:api,
      define:(id,def)=>commit(id,define,def),
      instantiate:(id,instance)=>commit(id,instantiate,instance),
      override:(id,instance,patch)=>commit(id,override,instance,patch),
      publish:(definition,designIds)=>{
        if (!Array.isArray(designIds) || !designIds.length || new Set(designIds).size !== designIds.length) fail('Specify unique target designs');
        const candidates=designIds.map(id=>{
          const current=root.Frame.agent.getDocument(id);
          if (!current.componentLibrary?.definitions?.[definition.id]) fail('Target design does not contain the component');
          const next=define(current,definition);next.revisionId='r-'+crypto.randomUUID();
          root.FrameDocument.validate(next);root.Frame.validateRevision?.(next);return next;
        });
        return candidates.map(doc=>root.Frame.agent.updateDocument(doc));
      }
    };
  }
})(typeof window === 'undefined' ? globalThis : window);
