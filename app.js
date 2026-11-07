(() => {
  const STORAGE_PREFIX = "frame-feedback-v3:";
  const LEGACY_STORAGE_PREFIX = "frame-feedback-v1:";
  const MAX_LINES = 1000;
  const MAX_LINE_POINTS = 5000;
  const MAX_NOTES = 1000;
  const MAX_NOTE_TEXT = 4000;
  const MAX_HISTORY = 100;
  const NS = "http://www.w3.org/2000/svg";
  const designCanvas = document.getElementById("design");
  const board = document.getElementById("board");
  const stage = document.getElementById("stage");
  const brush = document.getElementById("brush");
  const picker = document.getElementById("design-picker");
  const undo = document.getElementById("undo");
  const redo = document.getElementById("redo");
  const clear = document.getElementById("clear");
  const resolveSelected = document.getElementById("resolve-selected");
  const statusFilter = document.getElementById("feedback-filter");
  const deleteSelected = document.getElementById("delete-selected");
  const download = document.getElementById("download");
  const retrySave = document.getElementById("retry-save");
  const count = document.getElementById("mark-count");
  const feedbackMenu = document.getElementById("feedback-menu");
  const sizeLabel = document.getElementById("design-size");
  const limitNotice = document.getElementById("feedback-limit-notice");
  const saveNotice = document.getElementById("feedback-save-notice");
  const designStatus = document.getElementById("design-status");
  const designStatusTitle = document.getElementById("design-status-title");
  const designStatusMessage = document.getElementById("design-status-message");
  const designErrorDetails = document.getElementById("design-error-details");
  const retryRender = document.getElementById("retry-render");
  const registrationNotice = document.getElementById("registration-notice");
  const registrationSummary = document.getElementById("registration-summary");
  const registrationErrors = document.getElementById("registration-errors");
  const toolButtons = [...document.querySelectorAll("[data-feedback-tool]")];
  const instructions = document.getElementById("feedback-instructions");
  const selectionStatus = document.getElementById("selection-status");
  const notesLayer = document.getElementById("notes-layer");
  const noteDialog = document.getElementById("note-dialog");
  const noteForm = document.getElementById("note-form");
  const noteText = document.getElementById("note-text");
  const noteError = document.getElementById("note-error");
  const noteDelete = document.getElementById("note-delete");
  const feedbackList = document.getElementById("feedback-list");
  const feedbackEmpty = document.getElementById("feedback-empty");
  const feedbackCards = new Map();
  const notePins = new Map();
  const lineMetadata = new WeakMap();
  const pendingFeedback = new Map();
  const sessions = new Map();
  let feedback = {lines: [], notes: [], unsaved: false, notice: ""};
  let design;
  let designReady = false;
  let lines = [];
  let active = null;
  let activePath = null;
  let activePointerId = null;
  let erasing = null;
  let pointLimitReached = false;
  let zoom = 1, panX = 0, panY = 0, panDrag = null, spacePan = false;
  let paintGeneration = 0;
  let pendingZoomPaint = null;
  let mode = "pen";
  let selectedLine = null;
  let notes = [];
  let selectedNote = null;
  let noteDraft = null;
  let noteDrag = null;
  const importDialog = document.getElementById("import-dialog");
  const importFile = document.getElementById("import-file");
  const importPreview = document.getElementById("import-preview");
  const importError = document.getElementById("import-error");
  const confirmImport = document.getElementById("confirm-import");
  let importDraft = null;
  let importRequest = 0;
  let keyboardAnchor = null;
  const keyboardCursor = document.getElementById("keyboard-cursor");
  let strokeBefore = null;
  let history = {undo: [], redo: []};
  let previousElements = [];
  let booting = true, restorationEpoch = 0, lastView = '1:0:0';
  function edited() { if(!booting && !Frame.restoringProject)restorationEpoch++; }

  function markMetadata(type, anchor) {
    const metadata = FrameFeedback.metadata(type, design);
    metadata.reviewedViewport = {width:design.width,height:design.height};
    if (Frame.documents.has(design.id)) {
      metadata.reviewedState = Frame.currentState(design.id);
      const element = Frame.agent.hitTest(design.id, anchor[0], anchor[1])[0];
      if (element) metadata.elementAnchor = {elementId: element.id, offset: [anchor[0] - element.bounds.x, anchor[1] - element.bounds.y]};
    }
    return metadata;
  }
  function storageKey() { return `${STORAGE_PREFIX}${design.id}`; }
  function currentDocument() {
    return FrameFeedback.document(design, lines.map(line => ({...lineMetadata.get(line), points: line})), notes);
  }
  function unpack(data) {
    const loadedLines = data.lines.map(({points, ...metadata}) => { lineMetadata.set(points, metadata); return points; });
    return {lines: loadedLines, notes: data.notes, unsaved: false, notice: ""};
  }
  const diskFeedback = new Map();
  function feedbackDocument(id, session) {
    return FrameFeedback.document(Frame.designs.get(id),
      session.feedback.lines.map(line => ({...lineMetadata.get(line), points: line})), session.feedback.notes);
  }
  function updateDiskFeedback(id, session) {
    if (design?.id === id && sessions.get(id) === session) updateControls();
  }
  function diskFeedbackError(id, session, error) {
    session.feedback.unsaved = true;
    session.feedback.notice = 'Feedback is unsaved on disk: ' + error.message + ' Download feedback before closing or reloading.';
    pendingFeedback.set(id, session.feedback);
    updateDiskFeedback(id, session);
  }
  const feedbackMarks = data => JSON.stringify([data?.lines || [], data?.notes || []]);
  function feedbackGestureActive(id) {
    return design?.id === id && (activePointerId !== null || noteDrag || noteDraft);
  }
  function installDiskFeedback(id, session, data) {
    const imported = unpack(structuredClone(data));
    Object.assign(session.feedback, imported, {blocked: false});
    session.history = {undo:[],redo:[]};
    if (design?.id === id) {
      lines = imported.lines; notes = imported.notes; history = session.history;
      selectedLine = null; selectedNote = null; redrawMarks();
    }
  }
  async function reconcileDiskFeedback(id, session, disk, error) {
    const record = await Frame.disk.read('feedback', id);
    if (!record) throw error;
    const saved = FrameFeedback.read(record.data, {id});
    if (feedbackGestureActive(id)) {
      setTimeout(() => flushDiskFeedback(id, session, disk), 100);
      return false;
    }
    const pending = disk.next;
    const merged = FrameFeedback.merge(disk.saved, pending, saved);
    if (!merged) {
      error.message = 'The same annotation was changed in another session. Your changes are still in this tab.';
      throw error;
    }
    if (feedbackMarks(merged) !== feedbackMarks(pending)) installDiskFeedback(id, session, merged);
    disk.generation = record.generation;
    disk.saved = saved;
    disk.next = feedbackMarks(merged) === feedbackMarks(saved) ? null : merged;
    if (!disk.next) acknowledgeDiskFeedback(id, session);
    return true;
  }
  function acknowledgeDiskFeedback(id, session) {
    session.feedback.unsaved = false;
    session.feedback.notice = '';
    pendingFeedback.delete(id);
  }
  function flushDiskFeedback(id, session, disk) {
    if (disk.running || disk.generation === undefined || !disk.next || disk.conflict) return;
    const data = disk.next;
    disk.running = true;
    Frame.disk.save('feedback', id, disk.generation, data).then(receipt => {
      disk.generation = receipt.generation;
      disk.saved = data;
      if (disk.next === data) {
        disk.next = null;
        acknowledgeDiskFeedback(id, session);
      }
      return true;
    }).catch(error => {
      if (error.name !== 'ConflictError') throw error;
      return reconcileDiskFeedback(id, session, disk, error);
    }).catch(error => {
      disk.conflict = error.name === 'ConflictError';
      diskFeedbackError(id, session, error);
      return false;
    }).then(saved => {
      disk.running = false;
      if (saved && disk.next) flushDiskFeedback(id, session, disk);
      updateDiskFeedback(id, session);
    });
  }
  function loadDiskFeedback(id, session) {
    let disk = diskFeedback.get(id);
    if (!disk) {
      disk = {saved: structuredClone(feedbackDocument(id, session))};
      diskFeedback.set(id, disk);
    }
    if (disk.loading || disk.generation !== undefined) return disk;
    disk.loading = true;
    Frame.disk.read('feedback', id).then(record => {
      const data = record && FrameFeedback.read(record.data, {id});
      const install = () => {
        if (feedbackGestureActive(id)) {
          setTimeout(install, 100); return;
        }
        disk.loading = false;
        if (record) {
          const merged = disk.next ? FrameFeedback.merge(disk.saved, disk.next, data) : data;
          if (!merged) {
            disk.conflict = true;
            diskFeedbackError(id, session, new Error('Disk feedback changed while opening this design.'));
            return;
          }
          installDiskFeedback(id, session, merged);
          if (disk.next) disk.next = merged;
        }
        disk.generation = record?.generation || 0;
        if (record) disk.saved = data;
        if (!record && !disk.next) {
          const migrate = () => {
            if (disk.generation !== 0 || disk.next || session.feedback.blocked ||
                !(session.feedback.lines.length || session.feedback.notes.length)) return;
            disk.next = structuredClone(feedbackDocument(id, session));
            pendingFeedback.set(id, session.feedback);
            flushDiskFeedback(id, session, disk);
          };
          if (Frame.project.startup?.ready) Frame.project.startup.ready.then(migrate);
          else migrate();
        }
        flushDiskFeedback(id, session, disk);
        updateDiskFeedback(id, session);
      };
      install();
    }).catch(error => {
      disk.loading = false;
      diskFeedbackError(id, session, error);
    });
    return disk;
  }
  function load() {
    if (Frame.disk) return unpack(FrameFeedback.read([], design));
    let saved;
    try {
      saved = localStorage.getItem(storageKey()) ?? localStorage.getItem(`frame-feedback-v2:${design.id}`) ??
        localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${design.id}`) ??
        (design.id === "sift" ? localStorage.getItem("sift-ui-feedback-v1") : null);
      return unpack(FrameFeedback.read(JSON.parse(saved || "[]"), design));
    } catch {
      return {lines: [], notes: [], unsaved: false, blocked: true,
        notice: "Saved feedback could not be loaded. Drawing and download still work. Existing saved data will not be overwritten."};
    }
  }
  function feedbackInViewport(mark) {
    const doc=Frame.documents.get(design?.id);
    return !mark?.reviewedViewport||!doc?.viewportLayouts||
      FrameDocument.viewportLayout(doc,mark.reviewedViewport.width)===FrameDocument.viewportLayout(doc,design.width);
  }
  function feedbackVisible(mark) {
    return feedbackInViewport(mark)&&(statusFilter.value==="all"||mark?.status===statusFilter.value);
  }
  function renderFeedbackList() {
    const marks = [...lines.map((line, index) => ({mark:line, metadata:lineMetadata.get(line), title:`Line ${index + 1}`, text:"Drawn annotation", type:"line"})),
      ...notes.map((note, index) => ({mark:note, metadata:note, title:`Note ${index + 1}`, text:note.text, type:"note"}))];
    const present = new Set();
    let visible = 0;
    let previousCard = null;
    for (const item of marks) {
      present.add(item.mark);
      let card = feedbackCards.get(item.mark);
      if (!card) {
        card = document.createElement("button"); card.type = "button"; card.className = "feedback-card";
        card.append(document.createElement("strong"), document.createElement("span"), document.createElement("span"));
        card.addEventListener("click", () => {
          setMode("select");
          if (item.type === "line") selectLine(item.mark); else selectNote(item.mark);
        });
        card.addEventListener("dblclick", () => { if (item.type === "note") openNoteEditor(item.mark); });
        feedbackCards.set(item.mark, card); feedbackList.append(card);
      }
      const expectedCard = previousCard ? previousCard.nextElementSibling : feedbackList.firstElementChild;
      if (expectedCard !== card) feedbackList.insertBefore(card, expectedCard);
      previousCard = card;
      const status = item.metadata?.status || "open";
      const values = [item.title, item.text, status === "resolved" ? "Resolved" : "Open"];
      [...card.children].forEach((child, index) => { if (child.textContent !== values[index]) child.textContent = values[index]; });
      card.dataset.status = status;
      card.setAttribute("aria-pressed", String(item.mark === selectedLine || item.mark === selectedNote));
      card.hidden = !feedbackVisible(item.metadata);
      if (!card.hidden) visible++;
    }
    for (const [mark, card] of feedbackCards) if (!present.has(mark)) { card.remove(); feedbackCards.delete(mark); }
    feedbackEmpty.hidden = visible > 0;
    feedbackEmpty.textContent = marks.length ? "No feedback matches this filter." : "No feedback yet. Use Pen or Note to mark what should change.";
  }
  function updateControls() {
    document.getElementById("import-feedback").disabled = !design;
    for (const button of toolButtons) button.disabled = !designReady || (button.dataset.feedbackTool === "interact" && !Frame.documents.has(design?.id));
    selectionStatus.textContent = selectedNote ? `Note ${notes.indexOf(selectedNote) + 1} selected. Drag it or use arrow keys to move.` : selectedLine ? `Line ${lines.indexOf(selectedLine) + 1} selected.` : "";
    undo.disabled = activePointerId === null && !noteDrag?.moved && history.undo.length === 0;
    redo.disabled = activePointerId !== null || !!noteDrag?.moved || history.redo.length === 0;
    undo.title = erasing ? "Undo erasing feedback" : active ? "Undo drawing line" : noteDrag?.moved ? "Undo moving note" : history.undo.at(-1)?.label || "Undo";
    redo.title = history.redo.at(-1)?.label ? `Redo: ${history.redo.at(-1).label}` : "Redo";

    download.disabled = !design;
    const selected = selectedNote || (selectedLine && lineMetadata.get(selectedLine));
    resolveSelected.disabled = !selected;
    resolveSelected.textContent = selected?.status === "resolved" ? "Reopen" : "Mark resolved";
    deleteSelected.disabled = !designReady || (!selectedLine && !selectedNote);
    retrySave.hidden = !feedback.unsaved;
    retrySave.disabled = !!feedbackGestureActive(design?.id);
    saveNotice.textContent = feedback.notice;
    const marks = [...lines.map(line=>lineMetadata.get(line)), ...notes].filter(feedbackInViewport);
    clear.disabled = lines.length === 0 && notes.length === 0;
    const visibleLines=marks.filter(mark=>mark.type==="stroke").length,visibleNotes=marks.length-visibleLines;
    const openCount = marks.filter(mark=>mark.status!=="resolved").length;
    count.title = openCount + " open · " + (marks.length-openCount) + " resolved";
    count.textContent = `${visibleLines} ${visibleLines === 1 ? "line" : "lines"}`;
    if (visibleNotes) count.textContent += ` · ${visibleNotes} ${visibleNotes === 1 ? "note" : "notes"}`;
    const notices = [];
    if (lines.length > MAX_LINES || lines.some(line => line.length > MAX_LINE_POINTS)) {
      notices.push("Older feedback exceeds the drawing limits. All marks are preserved and can be downloaded.");
    }
    if (lines.length >= MAX_LINES) {
      notices.push("1,000-line limit reached. Delete, undo, or clear lines to keep drawing.");
    }
    if (pointLimitReached) {
      notices.push("This line ended at the 5,000-point limit. Start a new line to continue.");
    }
    if (notes.length >= MAX_NOTES) notices.push("1,000-note limit reached. Delete a note to add another.");
    limitNotice.textContent = notices.join(" ");
    renderFeedbackList();
    window.dispatchEvent(new Event("frame:feedback-save-status"));
  }
  function save() {
    edited();
    feedback.lines = lines;
    feedback.notes = notes;
    if (Frame.disk) {
      const session = sessions.get(design.id);
      const disk = loadDiskFeedback(design.id, session);
      disk.next = structuredClone(currentDocument());
      pendingFeedback.set(design.id, feedback);
      flushDiskFeedback(design.id, session, disk);
      updateControls();
      window.dispatchEvent(new CustomEvent('frame:feedback-changed', {detail: {id: design.id}}));
      return;
    }
    try {
      if (feedback.blocked) throw new Error("Saved data is protected");
      localStorage.setItem(storageKey(), JSON.stringify(currentDocument()));
      feedback.unsaved = false;
      feedback.notice = "";
      pendingFeedback.delete(design.id);
    } catch (error) {
      feedback.unsaved = true;
      const reason = feedback.blocked ? "existing unreadable data is protected" : error?.name === "QuotaExceededError" ? "browser storage is full" : "browser storage is unavailable";
      feedback.notice = feedback.blocked
        ? `Feedback is unsaved: ${reason}. Download your new feedback, then reload to recover the existing data.`
        : `Feedback is unsaved: ${reason}. Download feedback before closing or reloading, or retry saving.`;
      pendingFeedback.set(design.id, feedback);
    }
    updateControls();
    window.dispatchEvent(new CustomEvent('frame:feedback-changed', {detail: {id: design.id}}));
  }

  // Finished strokes are immutable: retain point arrays rather than copying them.
  // Notes remain live objects for pointer capture/focus, so snapshot their mutable fields.
  function snapshot() {
    return {lines:[...lines],lineState:lines.map(line=>JSON.parse(JSON.stringify(lineMetadata.get(line)))),
      notes:notes.map(note=>({...JSON.parse(JSON.stringify(note)),note}))};
  }
  function record(before, label, updateTimestamps = true) {
    let after = snapshot();
    const unchanged = before.lines.length === after.lines.length && before.lines.every((line,i)=>line===after.lines[i]&&JSON.stringify(before.lineState[i])===JSON.stringify(after.lineState[i])) &&
      before.notes.length === after.notes.length && before.notes.every((entry,i)=>entry.note===after.notes[i].note&&JSON.stringify({...entry,note:undefined})===JSON.stringify({...after.notes[i],note:undefined}));
    if (unchanged) return false;
    for (const entry of before.notes) {
      const note = notes.find(note => note === entry.note);
      if (updateTimestamps && note && (note.text !== entry.text || note.status !== entry.status || note.anchor.some((value, axis) => value !== entry.anchor[axis]))) note.updatedAt = new Date().toISOString();
    }
    for(const entry of before.notes) {
      const note=notes.find(note=>note===entry.note);
      if(note?.elementAnchor&&note.anchor.some((v,i)=>v!==entry.anchor[i])&&Frame.documents.has(design.id)) {
        const target=Frame.agent.inspect(design.id,{elementId:note.elementAnchor.elementId})[0];
        if(target)note.elementAnchor={elementId:target.id,offset:[note.anchor[0]-target.bounds.x,note.anchor[1]-target.bounds.y]};
      }
    }
    after = snapshot();
    history.undo.push({before, after, label});
    if (history.undo.length > MAX_HISTORY) history.undo.shift();
    history.redo = [];
    return true;
  }
  function restore(state) {
    lines = [...state.lines];
    lines.forEach((line,i)=>lineMetadata.set(line,JSON.parse(JSON.stringify(state.lineState[i]))));
    notes = state.notes.map(entry => {
      const {note,...fields}=entry;
      for(const key of Object.keys(note))delete note[key];
      Object.assign(note,JSON.parse(JSON.stringify(fields)));
      return note;
    });
    selectedLine = null;
    selectedNote = null;
    pointLimitReached = false;
    redrawMarks();
    save();
  }
  function travelHistory(direction) {
    finishBrush();
    finishNoteDrag();
    closeNoteEditor();
    const entry = history[direction].pop();
    if (!entry) return;
    history[direction === "undo" ? "redo" : "undo"].push(entry);
    restore(direction === "undo" ? entry.before : entry.after);
  }

  function geometry() {
    const boardBounds = board.getBoundingClientRect();
    const stageBounds = stage.getBoundingClientRect();
    return {
      boardBounds, stageBounds,
      scaleX: boardBounds.width / design.width,
      scaleY: boardBounds.height / design.height,
      offsetX: boardBounds.left - stageBounds.left,
      offsetY: boardBounds.top - stageBounds.top
    };
  }
  function pointFromEvent(event) {
    const {boardBounds, scaleX, scaleY} = geometry();
    return [(event.clientX - boardBounds.left) / scaleX, (event.clientY - boardBounds.top) / scaleY];
  }
  function pathData(points, view = geometry()) {
    return points.map(([x, y], index) =>
      `${index ? "L" : "M"}${(view.offsetX + x * view.scaleX).toFixed(1)} ${(view.offsetY + y * view.scaleY).toFixed(1)}`
    ).join(" ");
  }
  function makePath(points, index = lines.length - 1) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", pathData(points));
    path.dataset.lineIndex = index;
    path.dataset.markId = lineMetadata.get(points).id;
    path.setAttribute("role", "button");
    path.setAttribute("aria-label", `Feedback line ${index + 1}`);
    path.addEventListener("focus", () => {
      if (mode === "select") selectLine(points);
    });
    brush.append(path);
    updatePathSelection(path, points);
    return path;
  }
  function updatePathSelection(path, points) {
    path.setAttribute("tabindex", mode === "select" ? "0" : "-1");
    path.setAttribute("aria-pressed", points === selectedLine ? "true" : "false");
    path.classList.toggle("selected", points === selectedLine);
    path.classList.toggle("resolved", lineMetadata.get(points)?.status === "resolved");
    path.toggleAttribute("hidden", !feedbackVisible(lineMetadata.get(points)) || !!erasing?.lines.has(points));
  }
  function selectLine(line) {
    selectedLine = line;
    selectedNote = null;
    for (const path of brush.querySelectorAll("path")) {
      updatePathSelection(path, lines[Number(path.dataset.lineIndex)]);
    }
    updateNoteSelection();
    updateControls();
  }
  function selectNote(note) {
    selectLine(null);
    selectedNote = note;
    updateNoteSelection();
    updateControls();
  }
  function deleteSelection() {
    if (!selectedLine && !selectedNote) return;
    finishBrush();
    finishNoteDrag();
    closeNoteEditor();
    const before = snapshot();
    if (selectedLine) lines = lines.filter(line => line !== selectedLine);
    if (selectedNote) notes = notes.filter(note => note !== selectedNote);
    record(before, "Delete feedback");
    selectLine(null);
    pointLimitReached = false;
    redrawMarks();
    save();
    document.querySelector(`[data-feedback-tool="${mode}"]`).focus();
  }
  function updateNoteSelection() {
    for (const [note, pin] of notePins) {
      pin.classList.toggle("selected", note === selectedNote);
      pin.setAttribute("aria-pressed", note === selectedNote ? "true" : "false");
      pin.classList.toggle("resolved", note.status === "resolved");
      pin.hidden = !feedbackVisible(note) || !!erasing?.notes.has(note);
      pin.tabIndex = mode === "pen" || mode === "erase" ? -1 : 0;
    }
  }
  function positionNote(pin, note) {
    const view = geometry();
    const x = view.offsetX + note.anchor[0] * view.scaleX;
    const y = view.offsetY + note.anchor[1] * view.scaleY;
    pin.style.left = `${x}px`;
    pin.style.top = `${y}px`;
    const rightSpace = view.stageBounds.width - x - 26;
    const leftSpace = x - 26;
    const useLeft = rightSpace < 190 && leftSpace > rightSpace;
    pin.dataset.side = useLeft ? "left" : "right";
    pin.querySelector(".note-preview").style.width = `${Math.max(40, Math.min(190, useLeft ? leftSpace : rightSpace))}px`;
    pin.dataset.above = y + 90 > view.stageBounds.height ? "true" : "false";
  }
  function redrawNotes() {
    const remaining = new Set(notes);
    for (const [note, pin] of notePins) {
      if (!remaining.has(note)) { pin.remove(); notePins.delete(note); }
    }
    notes.forEach((note, index) => {
      let pin = notePins.get(note);
      if (!pin) {
        pin = makeNotePin(note);
        notePins.set(note, pin);
        notesLayer.append(pin);
      }
      pin.querySelector(".note-number").textContent = index + 1;
      pin.querySelector(".note-preview").textContent = note.text;
      pin.setAttribute("aria-label", `Note ${index + 1}: ${note.text}`);
      positionNote(pin, note);
    });
    updateNoteSelection();
  }
  function makeNotePin(note) {
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "note-pin";
    pin.dataset.noteId = note.id;
    for (const name of ["note-number", "note-preview"]) {
      const span = document.createElement("span");
      span.className = name;
      pin.append(span);
    }
    let didDrag = false;
    pin.addEventListener("focus", () => { if (mode !== "pen") selectNote(note); });
    pin.addEventListener("pointerdown", event => {
      if (mode === "pen" || event.button !== 0 || noteDrag || active) return;
      didDrag = false;
      selectNote(note);
      noteDrag = {before: snapshot(), note, pin, pointerId: event.pointerId, start: pointFromEvent(event), anchor: [...note.anchor], client: [event.clientX, event.clientY], moved: false, markDragged: () => { didDrag = true; }};
      pin.setPointerCapture(event.pointerId);
      updateControls();
    });
    pin.addEventListener("pointermove", moveNoteDrag);
    pin.addEventListener("pointerup", event => { moveNoteDrag(event); finishNoteDrag(event); });
    pin.addEventListener("pointercancel", event => finishNoteDrag(event, true));
    pin.addEventListener("lostpointercapture", event => finishNoteDrag(event));
    pin.addEventListener("click", event => {
      if (mode === "pen") return;
      if (didDrag && event.detail !== 0) return;
      selectNote(note);
      if (mode === "note" || event.detail === 0) openNoteEditor(note);
    });
    pin.addEventListener("dblclick", () => { if (mode === "select") openNoteEditor(note); });
    return pin;
  }
  function moveNoteDrag(event) {
    if (!noteDrag || event.currentTarget !== noteDrag.pin || event.pointerId !== noteDrag.pointerId) return;
    if (!noteDrag.moved && Math.hypot(event.clientX - noteDrag.client[0], event.clientY - noteDrag.client[1]) < 4) return;
    noteDrag.moved = true;
    noteDrag.markDragged();
    const point = pointFromEvent(event);
    noteDrag.note.anchor = point.map((value, index) => noteDrag.anchor[index] + value - noteDrag.start[index]);
    positionNote(noteDrag.pin, noteDrag.note);
    event.preventDefault();
    updateControls();
  }
  function finishNoteDrag(event, cancel = false) {
    if (!noteDrag || (event && event.pointerId !== noteDrag.pointerId)) return;
    const drag = noteDrag;
    noteDrag = null;
    if (cancel) { drag.note.anchor = drag.anchor; positionNote(drag.pin, drag.note); }
    if (drag.pin.hasPointerCapture(drag.pointerId)) drag.pin.releasePointerCapture(drag.pointerId);
    if (drag.moved && !cancel) { record(drag.before, "Move note"); save(); }
    else updateControls();
  }
  function closeNoteEditor() {
    noteDraft = null;
    if (noteDialog.open) noteDialog.close();
  }
  function openNoteEditor(note, anchor = note?.anchor) {
    if (!note && notes.length >= MAX_NOTES) { updateControls(); return; }
    noteDraft = {note, anchor: [...anchor]};
    noteText.value = note?.text || "";
    noteError.textContent = "";
    noteDelete.hidden = !note;
    noteDialog.showModal();
    noteText.focus();
  }
  function distanceToSegmentSquared(x, y, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared)) : 0;
    return (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2;
  }
  function segmentsWithin(ax, ay, bx, by, cx, cy, dx, dy, radius) {
    if (Math.max(ax, bx) + radius < Math.min(cx, dx) || Math.max(cx, dx) + radius < Math.min(ax, bx) ||
        Math.max(ay, by) + radius < Math.min(cy, dy) || Math.max(cy, dy) + radius < Math.min(ay, by)) return false;
    const side = (x, y, x1, y1, x2, y2) => (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
    if (side(cx, cy, ax, ay, bx, by) * side(dx, dy, ax, ay, bx, by) < 0 &&
        side(ax, ay, cx, cy, dx, dy) * side(bx, by, cx, cy, dx, dy) < 0) return true;
    const limit = radius * radius;
    return distanceToSegmentSquared(ax, ay, cx, cy, dx, dy) <= limit ||
      distanceToSegmentSquared(bx, by, cx, cy, dx, dy) <= limit ||
      distanceToSegmentSquared(cx, cy, ax, ay, bx, by) <= limit ||
      distanceToSegmentSquared(dx, dy, ax, ay, bx, by) <= limit;
  }
  function lineWithin(line, from, to, scaleX, scaleY, radius) {
    for (let index = 0; index < line.length; index++) {
      const a = line[Math.max(0, index - 1)], b = line[index];
      if (segmentsWithin(...from, ...to, a[0] * scaleX, a[1] * scaleY, b[0] * scaleX, b[1] * scaleY, radius)) return true;
    }
    return false;
  }
  function lineAt(event) {
    const {boardBounds, scaleX, scaleY} = geometry();
    const point = [event.clientX - boardBounds.left, event.clientY - boardBounds.top];
    for (let index = lines.length - 1; index >= 0; index--) {
      const line = lines[index];
      if (feedbackVisible(lineMetadata.get(line)) && lineWithin(line, point, point, scaleX, scaleY, 8)) return line;
    }
    return null;
  }
  function sweepEraser(event) {
    const {boardBounds, scaleX, scaleY} = geometry();
    const point = [event.clientX - boardBounds.left, event.clientY - boardBounds.top];
    const from = erasing.point || point;
    erasing.point = point;
    const count = erasing.lines.size + erasing.notes.size;
    for (const line of lines) {
      if (!erasing.lines.has(line) && feedbackVisible(lineMetadata.get(line)) &&
          lineWithin(line, from, point, scaleX, scaleY, 10)) erasing.lines.add(line);
    }
    for (const note of notes) {
      const [x, y] = note.anchor;
      if (feedbackVisible(note) && distanceToSegmentSquared(x * scaleX, y * scaleY, ...from, ...point) <= 24 ** 2) {
        erasing.notes.add(note);
      }
    }
    if (erasing.lines.size + erasing.notes.size !== count) redrawMarks();
  }
  function setMode(next) {
    finishBrush();
    finishNoteDrag();
    closeNoteEditor();
    finishPan();
    mode = next;
    window.dispatchEvent(new CustomEvent("frame:feedback-mode", {detail: {mode}}));
    brush.dataset.mode = mode;
    brush.setAttribute("aria-label", mode === "note" ? "Place feedback notes on the canvas" : mode === "select" ? "Select feedback marks on the canvas" : "Draw red feedback lines anywhere on the canvas");
    stage.dataset.feedbackMode = mode;
    for (const button of toolButtons) button.setAttribute("aria-pressed", button.dataset.feedbackTool === mode ? "true" : "false");
    instructions.textContent = mode === "pen"
      ? "Draw red lines anywhere. Hold Shift for a straight line. Hold Space to pan; scroll to zoom."
      : mode === "note" ? "Click to place a note. Or Tab to the canvas, use arrows to position, and Enter to place. Click a note to edit or drag to move."
      : "Click a line or note to select it, or use Tab. Double-click a note to edit. Escape deselects.";
    if (mode === "interact") instructions.textContent = "Use prototype controls and Tab to test interaction. Feedback tools resume annotation.";
    if (mode === "erase") {
      brush.setAttribute("aria-label", "Erase feedback marks");
      instructions.textContent = "Drag across lines or note pins to erase them. Undo restores the last sweep.";
    }
    if (mode === "pan") instructions.textContent = "Drag to pan, or middle-drag in any tool. Scroll to zoom. Fit restores the board.";
    selectLine(null);
    updateKeyboardCursor();
  }
  function updateKeyboardCursor() {
    keyboardCursor.hidden = !designReady || mode !== "note" || document.activeElement !== brush;
    if (!keyboardCursor.hidden) {
      keyboardAnchor ||= [design.width/2,design.height/2];
      const view=geometry();
      keyboardCursor.style.left = view.offsetX+keyboardAnchor[0]*view.scaleX+"px";
      keyboardCursor.style.top = view.offsetY+keyboardAnchor[1]*view.scaleY+"px";
    }
  }
  brush.addEventListener("focus",updateKeyboardCursor);
  brush.addEventListener("blur",updateKeyboardCursor);
  brush.addEventListener("keydown",event=>{
    if(mode!=="note" || event.target!==brush || event.metaKey || event.ctrlKey || event.altKey) return;
    keyboardAnchor ||= [design.width/2,design.height/2];
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
      event.preventDefault();event.stopPropagation();
      const axis=["ArrowLeft","ArrowRight"].includes(event.key)?0:1;
      keyboardAnchor[axis] += (["ArrowLeft","ArrowUp"].includes(event.key)?-1:1)*(event.shiftKey?1:10);
      keyboardAnchor[0]=Math.max(0,Math.min(design.width,keyboardAnchor[0]));
      keyboardAnchor[1]=Math.max(0,Math.min(design.height,keyboardAnchor[1]));
      updateKeyboardCursor();
    } else if(event.key==="Enter" || event.key===" ") {
      event.preventDefault();event.stopPropagation();openNoteEditor(null,keyboardAnchor);
    }
  });
  function redrawMarks() {
    const {stageBounds} = geometry();
    brush.setAttribute("viewBox", `0 0 ${stageBounds.width} ${stageBounds.height}`);
    brush.replaceChildren();
    lines.forEach((line, index) => {
      const path = makePath(line, index);
      if (line === active) activePath = path;
    });
    redrawNotes();
    updateKeyboardCursor();
    updateControls();
  }
  // Keep the raster backing sharp at the displayed zoom without unbounded canvases.
  function canvasResolution() {
    const styles = getComputedStyle(stage);
    const usableWidth = Math.max(1, stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight));
    const usableHeight = Math.max(1, stage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom));
    const displayScale = Math.min(1, usableWidth / design.width, usableHeight / design.height) * zoom;
    const requested = Math.max(1, displayScale) * (window.devicePixelRatio || 1);
    const density = Math.min(requested, 8192 / design.width, 8192 / design.height,
      Math.sqrt(16777216 / (design.width * design.height)));
    return {density, width: Math.max(1, Math.floor(design.width * density)), height: Math.max(1, Math.floor(design.height * density))};
  }
  function fitBoard(deferPaint = false) {
    if(Frame.restoringProject)return;
    if (!designReady) return;
    const viewKey=zoom+':'+panX+':'+panY;
    if(viewKey!==lastView){lastView=viewKey;edited();window.dispatchEvent(new Event('frame:view-changed'));}
    const styles = getComputedStyle(stage);
    const usableWidth = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const usableHeight = stage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    const scale = Math.min(1, usableWidth / design.width, usableHeight / design.height) * zoom;
    board.style.transform = "translate(" + panX + "px, " + panY + "px)";
    board.classList.toggle("zoomed", zoom > 1);
    document.getElementById("zoom-value").textContent = Math.round(zoom * 100) + "%";
    board.style.width = `${design.width * Math.max(scale, 0.01)}px`;
    board.style.height = `${design.height * Math.max(scale, 0.01)}px`;
    const resolution = canvasResolution();
    if (designCanvas.width !== resolution.width || designCanvas.height !== resolution.height) {
      if (deferPaint === true) scheduleZoomPaint();
      else paintDesign();
    } else if (pendingZoomPaint) {
      clearTimeout(pendingZoomPaint.timer);
      pendingZoomPaint.resolve();
      pendingZoomPaint = null;
    }
    redrawMarks();
  }
  function scheduleZoomPaint() {
    if (pendingZoomPaint) clearTimeout(pendingZoomPaint.timer);
    else {
      let resolve;
      const ready = new Promise(done => { resolve = done; });
      pendingZoomPaint = {resolve, timer: null};
      Frame.markRendering(ready);
    }
    // View geometry changes immediately; retain the raster during a zoom burst.
    pendingZoomPaint.timer = setTimeout(paintDesign, 350);
  }
  function paintDesign() {
    const pending = pendingZoomPaint;
    if (pending) { clearTimeout(pending.timer); pendingZoomPaint = null; }
    try {
      const {density, width, height} = canvasResolution();
      const generation = ++paintGeneration;
      designCanvas.width = width;
      designCanvas.height = height;
      const context = designCanvas.getContext("2d");
      if (!context) throw new Error("Canvas drawing is unavailable in this browser");
      context.setTransform(density, 0, 0, density, 0, 0);
      context.save();
      try { design.paint(context, {styleguide: Frame.activeStyleguide}); }
      finally { context.restore(); }
      designReady = true;
      board.hidden = false;
      brush.removeAttribute("hidden");
      notesLayer.hidden = false;
      designStatus.hidden = true;
      const renderedId=design.id, renderedRevision=design.revisionId, doc=Frame.documents.get(design.id);
      const assetsReady=doc?FrameDocument.prepareAssets(doc):Promise.resolve();
      const ready = Promise.all([assetsReady,document.fonts.ready]).then(()=>{
        if(doc&&generation===paintGeneration&&design.id===renderedId&&design.revisionId===renderedRevision) {
          context.save();try {design.paint(context,{styleguide:Frame.activeStyleguide});}finally{context.restore();}
        }
        return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      }).catch(error=>{
        if(generation===paintGeneration&&design.id===renderedId)showDesignStatus("Design assets could not be rendered","Check embedded assets, then retry.",error.message,true);
        throw error;
      });
      Frame.markRendering(ready);
      if (pending) ready.then(pending.resolve, pending.resolve);
    } catch (error) {
      if (pending) pending.resolve();
      showDesignStatus("Design could not be rendered", "Retry rendering or choose another design. Your feedback is still available for download.", error instanceof Error ? error.message : String(error), true);
    }
  }
  function showDesignStatus(title, message, details = "", canRetry = false) {
    designReady = false;
    board.hidden = true;
    brush.setAttribute("hidden", "");
    notesLayer.hidden = true;
    designStatus.hidden = false;
    designStatusTitle.textContent = title;
    designStatusMessage.textContent = message;
    designErrorDetails.textContent = details;
    designErrorDetails.parentElement.hidden = !details;
    retryRender.hidden = !canRetry;
    document.getElementById("open-first-design").hidden = !!design;
    updateControls();
  }
  function selectDesign(id) {
    edited();
    finishBrush();
    finishNoteDrag();
    closeNoteEditor();
    importDraft = null; importRequest++;
    if (importDialog.open) importDialog.close();
    selectedLine = null;
    selectedNote = null;
    if (design) window.dispatchEvent(new CustomEvent('frame:design-leaving', {detail: {id: design.id}}));
    design = Frame.designs.get(id);
    if (!design) return;
    picker.value = id;
    keyboardAnchor = null;
    finishPan();
    zoom = 1; panX = 0; panY = 0;
    sizeLabel.textContent = `${design.width} × ${design.height}`;
    board.setAttribute("aria-label", `${design.name} interface design`);
    designCanvas.setAttribute("aria-label", `${design.name} painted interface`);
    if (!sessions.has(id)) sessions.set(id, {feedback: load(), history: {undo: [], redo: []}});
    ({feedback, history} = sessions.get(id));
    lines = feedback.lines;
    notes = feedback.notes;
    if (Frame.disk) loadDiskFeedback(id, sessions.get(id));
    pointLimitReached = false;
    previousElements = Frame.documents.has(design.id) ? Frame.agent.inspect(design.id) : [];
    window.dispatchEvent(new CustomEvent("frame:design-selected", {detail: {design}}));
    paintDesign();
    fitBoard();
    if(!booting && !Frame.restoringProject)try { localStorage.setItem("frame-last-design", id); } catch { /* optional */ }
  }
  function finishBrush(cancelErase = false) {
    if (activePointerId === null) return;
    const pointerId = activePointerId;
    activePointerId = null;
    if (brush.hasPointerCapture(pointerId)) brush.releasePointerCapture(pointerId);
    if (erasing) {
      const erased = erasing;
      erasing = null;
      if (cancelErase || (!erased.lines.size && !erased.notes.size)) {
        redrawMarks();
        return;
      }
      const before = snapshot();
      lines = lines.filter(line => !erased.lines.has(line));
      notes = notes.filter(note => !erased.notes.has(note));
      pointLimitReached = false;
      record(before, "Erase feedback");
      redrawMarks();
      save();
      return;
    }
    if (active.length === 1) active.push([active[0][0] + 0.1, active[0][1] + 0.1]);
    activePath.setAttribute("d", pathData(active));
    lineMetadata.get(active).updatedAt = new Date().toISOString();
    record(strokeBefore, "Draw line");
    strokeBefore = null;
    active = null;
    activePath = null;
    save();
  }

  function finishPan(cancel = false) {
    if (!panDrag) return;
    const drag = panDrag;
    panDrag = null;
    if (cancel) [panX, panY] = drag.original;
    stage.classList.remove("is-panning");
    if (drag.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    if (cancel) fitBoard();
  }
  function movePan(event) {
    panX = panDrag.original[0] + event.clientX - panDrag.start[0];
    panY = panDrag.original[1] + event.clientY - panDrag.start[1];
    fitBoard();
  }
  // Capture on the stage so middle-drag works over notes and prototype controls too.
  stage.addEventListener("pointerdown", event => {
    if (!designReady || !(event.button === 1 || (spacePan && event.button === 0)) || event.pointerType !== "mouse" || activePointerId !== null || noteDrag || panDrag) return;
    event.preventDefault(); event.stopPropagation();
    panDrag = {button:event.button, pointerId:event.pointerId, target:stage, start:[event.clientX,event.clientY], original:[panX,panY]};
    stage.classList.add("is-panning");
    stage.setPointerCapture(event.pointerId);
  }, true);
  stage.addEventListener("pointermove", event => {
    if (panDrag?.target !== stage || panDrag.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    movePan(event);
    if (!(event.buttons & (panDrag.button === 1 ? 4 : 1))) finishPan();
  }, true);
  stage.addEventListener("pointerup", event => {
    if (panDrag?.target !== stage || panDrag.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation(); movePan(event); finishPan();
  }, true);
  for (const type of ["pointercancel", "lostpointercapture"]) stage.addEventListener(type, event => {
    if (panDrag?.target === stage && panDrag.pointerId === event.pointerId) finishPan(type === "pointercancel");
  }, true);
  const textEditing = target => target?.isContentEditable || target?.closest?.("input,textarea,select,[data-text-editor],.prototype-control");
  document.addEventListener("keydown", event => {
    if (event.key !== " " || event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || textEditing(event.target)) return;
    // Keep keyboard activation of controls and note placement intact.
    if (event.target.closest?.("button,summary,a") || (mode === "note" && event.target === brush)) return;
    if (!designReady || activePointerId !== null || noteDrag) return;
    event.preventDefault(); spacePan = true; stage.classList.add("space-pan");
  });
  const releaseSpace = () => {spacePan = false;stage.classList.remove("space-pan");finishPan();};
  document.addEventListener("keyup", event => {if (event.key === " ") releaseSpace();});
  window.addEventListener("blur", releaseSpace);
  stage.addEventListener("auxclick", event => { if (event.button === 1) event.preventDefault(); });
  stage.addEventListener("wheel", event => {
    if (!designReady || !event.deltaY || event.target.closest("input,textarea,select,[contenteditable]")) return;
    event.preventDefault();
    if (activePointerId !== null || noteDrag || panDrag) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
    const nextZoom = Math.max(0.25, Math.min(8, zoom * Math.exp(-delta * 0.002)));
    const bounds = board.getBoundingClientRect(), ratio = nextZoom / zoom;
    // Keep the design point beneath the cursor stationary while scaling.
    panX += (event.clientX - bounds.x - bounds.width / 2) * (1 - ratio);
    panY += (event.clientY - bounds.y - bounds.height / 2) * (1 - ratio);
    zoom = nextZoom; fitBoard(true);
  }, {passive:false});
  document.addEventListener("pointerdown", event => {
    if (feedbackMenu.open && !feedbackMenu.contains(event.target)) feedbackMenu.open = false;
  });
  feedbackMenu.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !feedbackMenu.open) return;
    event.stopPropagation();
    feedbackMenu.open = false;
    feedbackMenu.querySelector("summary").focus();
  });

  brush.addEventListener("pointerdown", (event) => {
    if (!designReady || event.button !== 0 || activePointerId !== null || noteDrag !== null || panDrag !== null) return;
    event.preventDefault();
    if (mode === "interact") return;
    if (mode === "pan") {
      panDrag = {pointerId: event.pointerId, target:brush, start: [event.clientX,event.clientY], original: [panX,panY]};
      brush.setPointerCapture(event.pointerId); return;
    }
    if (mode === "note") {
      openNoteEditor(null, pointFromEvent(event));
      return;
    }
    if (mode === "select") {
      selectLine(lineAt(event));
      return;
    }
    if (mode === "erase") {
      activePointerId = event.pointerId;
      erasing = {lines:new Set(), notes:new Set(), point:null};
      brush.setPointerCapture(event.pointerId);
      sweepEraser(event);
      updateControls();
      return;
    }
    if (lines.length >= MAX_LINES) {
      updateControls();
      return;
    }
    pointLimitReached = false;
    strokeBefore = snapshot();
    active = [pointFromEvent(event)];
    lineMetadata.set(active, markMetadata("stroke", active[0]));
    activePointerId = event.pointerId;
    lines.push(active);
    activePath = makePath(active);
    brush.setPointerCapture(event.pointerId);
    updateControls();
  });
  function updateActive(event) {
    if (event.pointerId !== activePointerId) return;
    if (erasing) {
      const samples = event.getCoalescedEvents?.();
      for (const sample of samples?.length ? samples : [event]) sweepEraser(sample);
      return;
    }
    if (!active) return;
    if (event.shiftKey) {
      active.splice(1, active.length - 1, pointFromEvent(event));
    } else {
      const samples = event.getCoalescedEvents?.();
      for (const sample of samples?.length ? samples : [event]) {
        const next = pointFromEvent(sample);
        const last = active[active.length - 1];
        if (Math.hypot(next[0] - last[0], next[1] - last[1]) >= 1) {
          active.push(next);
          if (active.length >= MAX_LINE_POINTS) {
            pointLimitReached = true;
            finishBrush();
            return;
          }
        }
      }
    }
    activePath.setAttribute("d", pathData(active));
  }
  brush.addEventListener("pointermove", event => {
    if (panDrag && panDrag.pointerId === event.pointerId) {
      movePan(event);
    } else updateActive(event);
  });
  brush.addEventListener("pointerup", (event) => {
    if (panDrag && panDrag.pointerId === event.pointerId) { movePan(event); finishPan(); return; }
    if (event.pointerId !== activePointerId) return;
    updateActive(event);
    finishBrush();
  });
  function finishPointer(event) {
    if (panDrag?.pointerId === event.pointerId) {
      finishPan(event.type === "pointercancel");
    }
    if (event.pointerId === activePointerId) finishBrush(event.type === "pointercancel");
  }
  brush.addEventListener("pointercancel", finishPointer);
  brush.addEventListener("lostpointercapture", finishPointer);
  undo.addEventListener("click", () => travelHistory("undo"));
  redo.addEventListener("click", () => travelHistory("redo"));
  clear.addEventListener("click", () => {
    finishBrush();
    finishNoteDrag();
    closeNoteEditor();
    const before = snapshot();
    lines = [];
    notes = [];
    record(before, "Clear feedback");
    selectedLine = null;
    selectedNote = null;
    pointLimitReached = false;
    redrawMarks();
    save();
  });
  noteForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!noteDraft) return;
    const text = noteText.value.trim();
    if (!text || text.length > MAX_NOTE_TEXT) {
      noteError.textContent = `Write a note between 1 and ${MAX_NOTE_TEXT.toLocaleString("en-US")} characters.`;
      noteText.focus();
      return;
    }
    const before = snapshot();
    const note = noteDraft.note || {...markMetadata("note", noteDraft.anchor), anchor: noteDraft.anchor};
    note.text = text;
    if (!noteDraft.note) notes.push(note);
    record(before, noteDraft.note ? "Edit note" : "Add note");
    closeNoteEditor();
    redrawNotes();
    selectNote(note);
    save();
    notePins.get(note).focus();
  });
  document.getElementById("note-cancel").addEventListener("click", closeNoteEditor);
  noteDialog.addEventListener("cancel", () => { noteDraft = null; });
  noteDialog.addEventListener("close", () => { if (!noteDialog.open) noteDraft = null; });
  noteDialog.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); noteForm.requestSubmit(); }
  });
  noteDelete.addEventListener("click", () => {
    if (!noteDraft?.note) return;
    selectNote(noteDraft.note);
    deleteSelection();
  });
  function setFeedbackStatus(id, status) {
    if (!["open","resolved"].includes(status)) throw new Error("Status must be open or resolved");
    finishBrush(); finishNoteDrag();
    const note = notes.find(mark=>mark.id===id);
    const line = lines.find(line=>lineMetadata.get(line).id===id);
    const mark = note || (line && lineMetadata.get(line));
    if (!mark) throw new Error("Unknown feedback ID");
    if (mark.status === status) return;
    const before = snapshot();
    mark.status = status; mark.updatedAt = new Date().toISOString();
    if(mark.review) mark.review={...mark.review,decision:status==='open'?'reopened':'pending',decidedAt:status==='open'?mark.updatedAt:null};
    record(before, status === "resolved" ? "Resolve feedback" : "Reopen feedback");
    selectLine(null);redrawMarks();save();
  }
  function changeFeedbackReview(id, transform, label) {
    finishBrush();finishNoteDrag();
    const mark=notes.find(mark=>mark.id===id)||lineMetadata.get(lines.find(line=>lineMetadata.get(line).id===id));
    if(!mark)throw new Error('Unknown feedback ID');
    const next=transform(mark),before=snapshot();
    Object.assign(mark,next);record(before,label);redrawMarks();save();
    return JSON.parse(JSON.stringify(mark));
  }
  Frame.feedback = {
    list: (status="all") => { if (!["all","open","resolved"].includes(status)) throw new Error("Unknown feedback filter"); return JSON.parse(JSON.stringify([...currentDocument().lines,...notes].filter(mark=>status==="all"||mark.status===status))); },
    saveStatus: () => {
      const disk = diskFeedback.get(design?.id);
      return {pending: !!(disk?.loading || disk?.running || disk?.next), error: feedback.notice || null};
    },
    propose: (id,{revisionId,summary}={}) => {
      Frame.revisions.get(design.id,revisionId);
      return changeFeedbackReview(id,mark=>FrameFeedback.propose(mark,revisionId,summary),'Propose feedback fix');
    },
    accept: id => changeFeedbackReview(id,mark=>FrameFeedback.decide(mark,'accepted'),'Accept feedback fix'),
    reopen: id => changeFeedbackReview(id,mark=>FrameFeedback.decide(mark,'reopened'),'Reopen feedback fix'),
    setStatus: setFeedbackStatus
  };
  resolveSelected.addEventListener("click", () => {
    const mark=selectedNote || (selectedLine && lineMetadata.get(selectedLine));
    if (mark) setFeedbackStatus(mark.id, mark.status==="resolved"?"open":"resolved");
  });
  statusFilter.addEventListener("change",()=>{selectLine(null);redrawMarks();updateControls();});
  deleteSelected.addEventListener("click", deleteSelection);
  retrySave.addEventListener("click", () => {
    const disk = diskFeedback.get(design?.id);
    if (disk) disk.conflict = false;
    save();
  });
  retryRender.addEventListener("click", () => {
    paintDesign();
    fitBoard();
  });
  download.addEventListener("click", () => {
    finishBrush();
    finishNoteDrag();
    const data = JSON.stringify(currentDocument(), null, 2);
    const url = URL.createObjectURL(new Blob([data], {type: "application/json"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${design.id}-feedback.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.getElementById("import-feedback").addEventListener("click", () => {
    finishBrush(); finishNoteDrag(); closeNoteEditor();
    importDraft = null; importRequest++;
    importFile.value = ""; importError.textContent = ""; importPreview.textContent = "";
    confirmImport.disabled = true;
    importDialog.showModal(); importFile.focus();
  });
  importFile.addEventListener("change", async () => {
    const request = ++importRequest;
    const target = design;
    importDraft = null; confirmImport.disabled = true; importError.textContent = ""; importPreview.textContent = "Reading feedback…";
    try {
      const file = importFile.files[0];
      if (!file) { importPreview.textContent = ""; return; }
      const data = FrameFeedback.importDocument(JSON.parse(await file.text()), target);
      if (request !== importRequest || !importDialog.open || design !== target) return;
      importDraft = data;
      importPreview.textContent = `${data.lines.length} lines and ${data.notes.length} notes for ${data.design} (${data.width} × ${data.height}). Current feedback will be replaced.`;
      confirmImport.disabled = false;
    } catch (error) {
      if (request !== importRequest) return;
      importPreview.textContent = ""; importError.textContent = `Import cancelled: ${error.message}`;
    }
  });
  confirmImport.addEventListener("click", () => {
    if (!importDraft) return;
    const before = snapshot();
    const imported = unpack(importDraft);
    lines = imported.lines; notes = imported.notes;
    record(before, "Import feedback");
    feedback.blocked = false;
    importDialog.close(); importDraft = null;
    selectedLine = null; selectedNote = null; pointLimitReached = false;
    redrawMarks(); save();
  });
  document.getElementById("cancel-import").addEventListener("click", () => importDialog.close());
  importDialog.addEventListener("close", () => { if (!importDialog.open) { importDraft = null; importRequest++; } });
  picker.addEventListener("change", () => selectDesign(picker.value));
  for (const button of toolButtons) button.addEventListener("click", () => setMode(button.dataset.feedbackTool));
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.isComposing || event.target?.isContentEditable || event.target?.closest?.("input, textarea, select, [data-text-editor], .prototype-control")) return;
    if ((selectedLine || selectedNote) && ["Delete", "Backspace"].includes(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      deleteSelection();
      return;
    }
    if (selectedNote && notePins.get(selectedNote) === event.target && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const axis = ["ArrowLeft", "ArrowRight"].includes(event.key) ? 0 : 1;
      const before = snapshot();
      selectedNote.anchor[axis] += ["ArrowLeft", "ArrowUp"].includes(event.key) ? -step : step;
      record(before, "Move note");
      redrawNotes();
      save();
      return;
    }
    if (event.key === "Escape") {
      if (erasing) finishBrush(true);
      selectLine(null);
    }
    if (designReady && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (event.key.toLowerCase() === "p") setMode("pen");
      if (event.key.toLowerCase() === "e") setMode("erase");
      if (event.key.toLowerCase() === "v") setMode("select");
      if (event.key.toLowerCase() === "h") setMode("pan");
      if (event.key.toLowerCase() === "i" && Frame.documents.has(design?.id)) setMode("interact");
      if (event.key.toLowerCase() === "n") setMode("note");
    }
    if ((event.metaKey || event.ctrlKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === "z" || (key === "y" && !event.shiftKey)) {
        event.preventDefault();
        if (key === "y" || event.shiftKey) { if (!redo.disabled) travelHistory("redo"); }
        else travelHistory("undo");
      }
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (activePointerId !== null || noteDrag?.moved || (noteDraft && noteText.value !== (noteDraft.note?.text || "")) || pendingFeedback.size) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  function refreshDesigns() {
    picker.replaceChildren();
    for (const item of Frame.designs.values()) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      picker.append(option);
    }
    registrationNotice.hidden = Frame.errors.length === 0;
    registrationSummary.textContent = `${Frame.errors.length} design ${Frame.errors.length === 1 ? "registration failed" : "registrations failed"}.`;
    registrationErrors.textContent = Frame.errors.map(error => error.message).join("\n");
    picker.disabled = Frame.designs.size === 0;
    if (!Frame.designs.size) {
      sizeLabel.textContent = "";
      showDesignStatus("No design open", "Open a design file from your project.");
      return;
    }
    if (design && Frame.designs.get(design.id) === design) {
      picker.value = design.id;
      return;
    }
    let initial;
    try { initial = localStorage.getItem("frame-last-design"); } catch { /* optional */ }
    selectDesign(Frame.designs.has(initial) ? initial : Frame.designs.keys().next().value);
  }
  Frame.view = {
    get: () => ({zoom, panX, panY}),
    set: value => {
      if (!value || !Number.isFinite(value.zoom) || value.zoom < 0.25 || value.zoom > 8 || !Number.isFinite(value.panX) || !Number.isFinite(value.panY)) throw new Error("Invalid view");
      finishBrush(); finishNoteDrag(); finishPan(); ({zoom,panX,panY}=value); fitBoard(); return Frame.view.get();
    },
    fit: () => { finishBrush(); finishNoteDrag(); finishPan(); zoom=1;panX=panY=0;fitBoard(); },
    setMode
  };
  function zoomByButton(nextZoom) {
    finishBrush(); finishNoteDrag(); finishPan();
    zoom = nextZoom;
    fitBoard(true);
  }
  document.getElementById("zoom-in").addEventListener("click", () => zoomByButton(Math.min(8,zoom*1.25)));
  document.getElementById("zoom-out").addEventListener("click", () => zoomByButton(Math.max(0.25,zoom/1.25)));
  document.getElementById("fit-view").addEventListener("click", Frame.view.fit);
  function carryFeedback() {
    if (!Frame.documents.has(design?.id)) return;
    const next = Frame.agent.inspect(design.id);
    if (!previousElements.length) { previousElements=next; return; }
    const oldById=new Map(previousElements.map(node=>[node.id,node]));
    const nextById=new Map(next.map(node=>[node.id,node]));
    const moved=next.length!==previousElements.length || previousElements.some(node=>{
      const target=nextById.get(node.id);
      return !target || target.visible!==node.visible || JSON.stringify(node.bounds)!==JSON.stringify(target.bounds);
    });
    if(!moved){previousElements=next;return;}
    finishBrush();finishNoteDrag();
    if (selectedLine&&!feedbackInViewport(lineMetadata.get(selectedLine))) selectedLine=null;
    if (selectedNote&&!feedbackInViewport(selectedNote)) selectedNote=null;
    const before=snapshot();
    function carry(mark, points) {
      if(!feedbackInViewport(mark))return points;
      if(!mark.elementAnchor) {mark.needsReview=true;mark.reviewReason="Position-only feedback needs review after layout changes";return points;}
      const target=nextById.get(mark.elementAnchor.elementId),old=oldById.get(mark.elementAnchor.elementId);
      if(!target || target.visible===false) {mark.needsReview=true;mark.reviewReason="The anchored element is removed or hidden";return points;}
      mark.needsReview=false;delete mark.reviewReason;mark.anchorRevisionId=design.revisionId;
      if(points&&mark.elementAnchor.offset&&points.length) {
        const dx=target.bounds.x+mark.elementAnchor.offset[0]-points[0][0];
        const dy=target.bounds.y+mark.elementAnchor.offset[1]-points[0][1];
        return points.map(([x,y])=>[x+dx,y+dy]);
      }
      if(points&&old) return points.map(([x,y])=>[x+target.bounds.x-old.bounds.x,y+target.bounds.y-old.bounds.y]);
      if(!points&&mark.elementAnchor.offset) mark.anchor=[target.bounds.x+mark.elementAnchor.offset[0],target.bounds.y+mark.elementAnchor.offset[1]];
      return points;
    }
    lines=lines.map(line=>{const metadata={...lineMetadata.get(line)},points=carry(metadata,line);lineMetadata.set(points,metadata);return points;});
    for(const note of notes)carry(note);
    if (record(before,"Carry feedback to changed layout",false)) save();
    redrawMarks();previousElements=next;
    document.getElementById("feedback-revision-notice").textContent=[...lines.map(line=>lineMetadata.get(line)),...notes].filter(mark=>mark.needsReview).length+" marks need review after layout changes.";
  }
  Frame.projectBridge={
    canCheckpoint: () => activePointerId === null && !noteDrag && !noteDraft && !panDrag,
    restorationEpoch: () => restorationEpoch,
    restoreCheckpointFeedback: data => {
      if (Frame.disk && diskFeedback.get(design.id)?.generation > 0) return;
      const imported=unpack(data), protectedOriginal=feedback.blocked;
      const restored={...imported,blocked:protectedOriginal,notice:protectedOriginal?'Checkpoint restored; unreadable legacy feedback remains protected.':''};
      if(Frame.disk)Object.assign(feedback,restored);
      else feedback=restored;
      lines=feedback.lines;notes=feedback.notes;history={undo:[],redo:[]};
      if(Frame.disk)sessions.get(design.id).history=history;
      else sessions.set(design.id,{feedback,history});
      pendingFeedback.delete(design.id);
    },
    acknowledgeCheckpoint: data => {
      const session = sessions.get(data.design), target = Frame.designs.get(data.design);
      if (!session || !target) return false;
      const latest = FrameFeedback.document(target,
        session.feedback.lines.map(line => ({...lineMetadata.get(line), points: line})), session.feedback.notes);
      if (JSON.stringify(latest) !== JSON.stringify(data)) return false;
      session.feedback.unsaved = false;
      session.feedback.notice = session.feedback.blocked ? 'New feedback is checkpointed. Existing unreadable browser data remains protected.' : '';
      pendingFeedback.delete(data.design);
      if (design?.id === data.design) updateControls();
      return true;
    },
    importFeedback: data=>{
      const imported=unpack(FrameFeedback.importDocument(data,design));
      const before=snapshot();lines=imported.lines;notes=imported.notes;feedback.blocked=false;
      record(before,"Import project feedback");redrawMarks();save();
    }
  };
  Frame.connectUI({
    selectedId: () => design?.id,
    isReady: () => designReady,
    selectDesign,
    feedback: () => { finishBrush(); finishNoteDrag(); return currentDocument(); }
  });
  window.addEventListener("frame:design-updated", event => {
    if(Frame.restoringProject)return;
    if (design?.id !== event.detail.id) return;
    edited();
    if (event.detail.documentChanged) carryFeedback();
    else if (Frame.documents.has(design.id)) previousElements=Frame.agent.inspect(design.id);
    finishBrush(); finishNoteDrag(); closeNoteEditor();
    sizeLabel.textContent = design.width + " × " + design.height;
    paintDesign(); fitBoard(); refreshDesigns();
  });
  window.addEventListener("frame:styleguide-selected", () => {
    edited();if(Frame.restoringProject)return;
    finishBrush();
    finishNoteDrag();
    closeNoteEditor();
    if (design) { paintDesign(); fitBoard(); }
  });
  window.addEventListener("frame:designs-changed", refreshDesigns);
  window.addEventListener('frame:project-restored',()=>{
    previousElements=Frame.agent.inspect(design.id);lastView=zoom+':'+panX+':'+panY;
    selectedLine=null;selectedNote=null;sizeLabel.textContent=design.width+' × '+design.height;
    refreshDesigns();paintDesign();fitBoard();redrawMarks();updateControls();
  });
  setMode("pen");
  refreshDesigns();
  booting = false;
  new ResizeObserver(fitBoard).observe(stage);
  window.addEventListener("resize", fitBoard);
})();
