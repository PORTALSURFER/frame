// Shared browser/Node feedback codec. Storage and downloads use the same document.
(function(root) {
  const pair = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);
  const id = value => typeof value === "string" && !!value.trim();
  const timestamp = value => value === null || (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value);
  function metadata(type, design) {
    const now = new Date().toISOString();
    return {id: crypto.randomUUID(), type, designId: design.id, revisionId: design.revisionId ?? null, createdAt: now, updatedAt: now, status: "open"};
  }
  function validateReview(mark) {
    const review=mark.review;
    if(review===undefined)return;
    if(!review || !id(review.revisionId) || typeof review.summary!=='string' || !review.summary.trim() || review.summary.length>2000 ||
        !timestamp(review.proposedAt) || !review.proposedAt || !['pending','accepted','reopened'].includes(review.decision) ||
        (review.decision==='pending' ? review.decidedAt!==null : !review.decidedAt || !timestamp(review.decidedAt) || review.decidedAt<review.proposedAt) ||
        (review.decision==='accepted' && mark.status!=='resolved') || (review.decision==='reopened' && mark.status!=='open')) throw new Error('Invalid feedback review');
  }
  function propose(mark, revisionId, summary, now=new Date().toISOString()) {
    const next={...mark,status:'open',updatedAt:now,review:{revisionId,summary:typeof summary==='string'?summary.trim():summary,proposedAt:now,decision:'pending',decidedAt:null}};
    validateReview(next);return next;
  }
  function decide(mark, decision, now=new Date().toISOString()) {
    if(!mark.review || !['accepted','reopened'].includes(decision))throw new Error('Propose a revision before recording a review decision');
    const next={...mark,status:decision==='accepted'?'resolved':'open',updatedAt:now,review:{...mark.review,decision,decidedAt:now}};
    validateReview(next);return next;
  }
  function validate(data, design) {
    if (data?.version !== 3) throw new Error("Unsupported feedback version");
    if (!id(data.design) || data.design !== design.id) throw new Error("Feedback belongs to a different design");
    if (![data.width, data.height].every(value => Number.isInteger(value) && value > 0) ||
        !(data.revisionId === null || id(data.revisionId)) || !Array.isArray(data.lines) || !Array.isArray(data.notes)) throw new Error("Invalid feedback document context");
    const ids = new Set();
    for (const [items, type] of [[data.lines, "stroke"], [data.notes, "note"]]) {
      for (const mark of items) {
        if (!mark || !id(mark.id) || ids.has(mark.id) || mark.type !== type || mark.designId !== data.design ||
            !(mark.revisionId === null || id(mark.revisionId)) || !timestamp(mark.createdAt) || !timestamp(mark.updatedAt) ||
            (mark.createdAt && mark.updatedAt && mark.updatedAt < mark.createdAt)) throw new Error("Invalid or duplicate feedback metadata");
        if (mark.status !== undefined && !["open", "resolved"].includes(mark.status)) throw new Error("Invalid feedback status");
        validateReview(mark);
        if(mark.reviewedState!==undefined && !id(mark.reviewedState))throw new Error('Invalid reviewed state');
        ids.add(mark.id);
        if (mark.elementAnchor !== undefined && (!mark.elementAnchor || !id(mark.elementAnchor.elementId) ||
            (mark.elementAnchor.offset !== undefined && !pair(mark.elementAnchor.offset)))) throw new Error("Invalid element anchor");
        if (type === "stroke" && (!Array.isArray(mark.points) || !mark.points.length || !mark.points.every(pair))) throw new Error("Invalid stroke coordinates");
        if (type === "note" && (typeof mark.text !== "string" || !mark.text.trim() || !pair(mark.anchor))) throw new Error("Invalid note");
      }
    }
    return data;
  }
  function read(data, design) {
    if (data?.version === 3) { validate(data, design); return {...data, lines: data.lines.map(mark => ({status:"open", ...mark})), notes: data.notes.map(mark => ({status:"open", ...mark}))}; }
    if (!Array.isArray(data) && data?.version !== 2) throw new Error("Unsupported feedback version");
    if (!Array.isArray(data) && data.design !== undefined && data.design !== design.id) throw new Error("Feedback belongs to a different design");
    const ids = new Set();
    const notes = (Array.isArray(data.notes) ? data.notes : []).filter(note => {
      if (!note || !id(note.id) || ids.has(note.id) || typeof note.text !== "string" || !note.text.trim() || !pair(note.anchor)) return false;
      ids.add(note.id);
      return true;
    }).map(note => ({id: note.id, type: "note", designId: design.id, revisionId: null, createdAt: null, updatedAt: null, status: "open", text: note.text, anchor: note.anchor}));
    const oldLines = Array.isArray(data) ? data : data.lines;
    const lines = (Array.isArray(oldLines) ? oldLines : []).filter(Array.isArray).map(line => line.filter(pair)).filter(line => line.length).map((points, index) => {
      let markId = `legacy-stroke-${design.id}-${index + 1}`;
      while (ids.has(markId)) markId += "-stroke";
      ids.add(markId);
      return {id: markId, type: "stroke", designId: design.id, revisionId: null, createdAt: null, updatedAt: null, status: "open", points};
    });
    return {version: 3, design: design.id, revisionId: null, width: data.width || design.width, height: data.height || design.height, lines, notes};
  }
  function importDocument(data, design) {
    const migrated = read(data, design);
    if (migrated.width !== design.width || migrated.height !== design.height) throw new Error("Feedback dimensions do not match this design");
    if (data?.version !== 3) {
      const originalLines = Array.isArray(data) ? data : data.lines;
      const originalNotes = Array.isArray(data) ? [] : (data.notes ?? []);
      if (!Array.isArray(originalLines) || !Array.isArray(originalNotes) || originalLines.length !== migrated.lines.length ||
          originalNotes.length !== migrated.notes.length || originalLines.some((line, i) => !Array.isArray(line) || line.length !== migrated.lines[i].points.length)) {
        throw new Error("Legacy feedback contains invalid marks; import was cancelled");
      }
    }
    return validate(migrated, design);
  }
  function document(design, lines, notes) {
    return {version: 3, design: design.id, revisionId: design.revisionId ?? null, width: design.width, height: design.height, lines, notes};
  }
  function merge(base, local, saved) {
    const signature = value => JSON.stringify(value, (_, entry) =>
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]]))
        : entry);
    const marks = data => new Map([...(data?.lines || []), ...(data?.notes || [])].map(mark => [mark.id, mark]));
    const before = marks(base), ours = marks(local), theirs = marks(saved);
    const result = {...local, lines: [], notes: []};
    for (const id of new Set([...ours.keys(), ...theirs.keys()])) {
      const original = signature(before.get(id)), current = ours.get(id), stored = theirs.get(id);
      const localValue = signature(current), savedValue = signature(stored);
      if (localValue !== savedValue && localValue !== original && savedValue !== original) return null;
      const mark = localValue === original ? stored : current;
      if (mark) result[mark.type === "stroke" ? "lines" : "notes"].push(mark);
    }
    return result;
  }
  const api = {metadata, validate, read, importDocument, document, merge, propose, decide};
  if (typeof module !== "undefined") module.exports = api;
  else root.FrameFeedback = api;
})(typeof window === "undefined" ? globalThis : window);
