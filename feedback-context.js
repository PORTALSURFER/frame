// Evidence for interpreting marks. Candidate matches never resolve feedback.
(() => {
  Frame.agent.reviewContext = () => {
    const feedback = Frame.agent.getFeedback(), id = feedback.design;
    const nodes = Frame.documents.has(id) ? Frame.agent.inspect(id) : [];
    const byId = new Map(nodes.map(node => [node.id, node]));
    const revisions = new Map();
    function original(mark) {
      if (!mark.revisionId || !Frame.revisions) return null;
      if (!revisions.has(mark.revisionId)) {
        try { revisions.set(mark.revisionId, Frame.revisions.get(id, mark.revisionId)); }
        catch { revisions.set(mark.revisionId, null); }
      }
      return revisions.get(mark.revisionId);
    }
    function context(mark) {
      const points = mark.points || [mark.anchor];
      let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity;
      for (const point of points) { x = Math.min(x, point[0]); y = Math.min(y, point[1]); right = Math.max(right, point[0]); bottom = Math.max(bottom, point[1]); }
      const bounds = {x, y, width: right - x, height: bottom - y};
      const target = byId.get(mark.elementAnchor?.elementId);
      const candidates = nodes.filter(node => node.visible !== false && node.bounds.x <= right && node.bounds.y <= bottom &&
        node.bounds.x + node.bounds.width >= x && node.bounds.y + node.bounds.height >= y);
      const prior = original(mark);
      const anchored = target && target.visible !== false;
      return {mark, bounds, target: anchored ? target : null,
        match: anchored ? 'element-anchor' : 'geometry-candidates',
        needsReview: !!mark.needsReview || !anchored,
        reason: mark.reviewReason || (anchored ? null : mark.elementAnchor ? 'Anchored element is missing or hidden' : 'Position-only feedback requires target review'),
        candidates: candidates.slice(-10).reverse(), candidateCount: candidates.length,
        reviewedRevisionAvailable: !!prior,
        // Source declarations are not resolved geometry; old state may be unknown.
        originalDeclaration: prior?.elements.find(node => node.id === mark.elementAnchor?.elementId) || null};
    }
    return {designId: id, revisionId: feedback.revisionId,
      viewport: {width: feedback.width, height: feedback.height},
      state: Frame.documents.has(id) ? Frame.currentState(id) : null,
      view: Frame.view?.get() || null,
      annotations: [...feedback.lines, ...feedback.notes].map(context)};
  };
})();
