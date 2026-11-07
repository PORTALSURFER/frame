// Small manifests group independent saved designs; revisions and feedback stay with each design.
(function(root) {
  const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,127}$/i.test(value);
  const text = value => typeof value === 'string' && !!value.trim() && value.length <= 120;
  function scope(input) {
    if (!input || !text(input.state) || !(input.viewId === null || text(input.viewId)) ||
        ![input.width,input.height].every(n => Number.isInteger(n) && n > 0 && n <= 8192)) throw new Error('Invalid concept scope');
    return input;
  }
  function sameScope(a,b) {
    return a.viewId === b.viewId && a.state === b.state && a.width === b.width && a.height === b.height;
  }
  function validate(data, {id = data?.designId} = {}) {
    if (data?.version !== 1 || !validId(id) || data.designId !== id || !Array.isArray(data.groups) || data.groups.length > 256) throw new Error('Invalid concept family');
    const groupIds = new Set(), designIds = new Set(), scopes = new Set();
    for (const group of data.groups) {
      scope(group.scope);
      const key = JSON.stringify([group.scope.viewId,group.scope.state,group.scope.width,group.scope.height]);
      if (!validId(group.id) || groupIds.has(group.id) || !Array.isArray(group.versions) || !group.versions.length || group.versions.length > 32 ||
          scopes.has(key)) throw new Error('Invalid or duplicate concept group');
      groupIds.add(group.id);scopes.add(key);
      const versionIds = new Set();
      for (const version of group.versions) {
        if (!validId(version.id) || !validId(version.designId) || version.designId === id || !text(version.name) ||
            versionIds.has(version.id) || designIds.has(version.designId) || typeof version.createdAt !== 'string' || !Number.isFinite(Date.parse(version.createdAt))) throw new Error('Invalid or duplicate concept version');
        versionIds.add(version.id);designIds.add(version.designId);
      }
      if (group.chosenId !== null && !versionIds.has(group.chosenId)) throw new Error('Chosen concept is missing');
    }
    return data;
  }
  function envelope(bundle) {
    if (bundle?.format !== 'frame-concepts' || bundle.version !== 1 || !Array.isArray(bundle.projects)) throw new Error('Invalid concept bundle');
    validate(bundle.family);
    const expected = new Set([bundle.family.designId,...bundle.family.groups.flatMap(group => group.versions.map(version => version.designId))]);
    const found = new Set();
    for (const project of bundle.projects) {
      const id = project?.archive?.designId;
      if (!expected.has(id) || found.has(id)) throw new Error('Unexpected or duplicate concept project');
      found.add(id);
    }
    if (found.size !== expected.size) throw new Error('Concept bundle is missing a project');
    return bundle;
  }
  const api = {validId,scope,sameScope,validate,envelope};
  if (typeof module !== 'undefined') module.exports = api;
  else root.FrameConceptModel = api;
})(typeof window === 'undefined' ? globalThis : window);
