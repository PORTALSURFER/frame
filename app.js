(() => {
  const STORAGE_PREFIX = "frame-feedback-v1:";
  const MAX_LINES = 1000;
  const MAX_LINE_POINTS = 5000;
  const NS = "http://www.w3.org/2000/svg";
  const designCanvas = document.getElementById("design");
  const board = document.getElementById("board");
  const stage = document.getElementById("stage");
  const brush = document.getElementById("brush");
  const picker = document.getElementById("design-picker");
  const undo = document.getElementById("undo");
  const clear = document.getElementById("clear");
  const download = document.getElementById("download");
  const retrySave = document.getElementById("retry-save");
  const count = document.getElementById("mark-count");
  const sizeLabel = document.getElementById("design-size");
  const limitNotice = document.getElementById("feedback-limit-notice");
  const saveNotice = document.getElementById("feedback-save-notice");
  const pendingFeedback = new Map();
  let feedback;
  let design;
  let lines = [];
  let active = null;
  let activePath = null;
  let activePointerId = null;
  let pointLimitReached = false;

  function storageKey() { return `${STORAGE_PREFIX}${design.id}`; }
  function validLines(value) {
    if (!Array.isArray(value)) return [];
    // Drawing limits apply to new strokes, not to feedback saved by older versions.
    return value.filter(Array.isArray).map((line) =>
      line.filter((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))
    ).filter((line) => line.length > 0);
  }
  function load() {
    if (pendingFeedback.has(design.id)) return pendingFeedback.get(design.id);
    try {
      const saved = localStorage.getItem(storageKey()) ??
        (design.id === "sift" ? localStorage.getItem("sift-ui-feedback-v1") : null);
      return {lines: validLines(JSON.parse(saved || "[]")), unsaved: false, notice: ""};
    } catch {
      return {lines: [], unsaved: false, notice: "Saved feedback could not be loaded. Drawing and download still work."};
    }
  }
  function updateControls() {
    undo.disabled = clear.disabled = lines.length === 0;
    download.disabled = lines.length === 0 && !feedback.unsaved;
    retrySave.hidden = !feedback.unsaved;
    retrySave.disabled = active !== null;
    saveNotice.textContent = feedback.notice;
    count.textContent = `${lines.length} ${lines.length === 1 ? "line" : "lines"}`;
    const notices = [];
    if (lines.length > MAX_LINES || lines.some(line => line.length > MAX_LINE_POINTS)) {
      notices.push("Older feedback exceeds the drawing limits. All marks are preserved and can be downloaded.");
    }
    if (lines.length >= MAX_LINES) {
      notices.push("1,000-line limit reached. Undo or clear lines to keep drawing.");
    }
    if (pointLimitReached) {
      notices.push("This line ended at the 5,000-point limit. Start a new line to continue.");
    }
    limitNotice.textContent = notices.join(" ");
  }
  function save() {
    feedback.lines = lines;
    try {
      localStorage.setItem(storageKey(), JSON.stringify(lines));
      feedback.unsaved = false;
      feedback.notice = "";
      pendingFeedback.delete(design.id);
    } catch (error) {
      feedback.unsaved = true;
      const reason = error?.name === "QuotaExceededError" ? "browser storage is full" : "browser storage is unavailable";
      feedback.notice = `Feedback is unsaved: ${reason}. Download feedback before closing or reloading, or retry saving.`;
      pendingFeedback.set(design.id, feedback);
    }
    updateControls();
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
  function makePath(points) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", pathData(points));
    brush.append(path);
    return path;
  }
  function redrawMarks() {
    const {stageBounds} = geometry();
    brush.setAttribute("viewBox", `0 0 ${stageBounds.width} ${stageBounds.height}`);
    brush.replaceChildren();
    lines.forEach((line) => {
      const path = makePath(line);
      if (line === active) activePath = path;
    });
    updateControls();
  }
  function fitBoard() {
    if (!design) return;
    const styles = getComputedStyle(stage);
    const usableWidth = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const usableHeight = stage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    const scale = Math.min(1, usableWidth / design.width, usableHeight / design.height);
    board.style.width = `${design.width * Math.max(scale, 0.01)}px`;
    board.style.height = `${design.height * Math.max(scale, 0.01)}px`;
    redrawMarks();
  }
  function paintDesign() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    designCanvas.width = Math.round(design.width * dpr);
    designCanvas.height = Math.round(design.height * dpr);
    const context = designCanvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, design.width, design.height);
    design.paint(context);
  }
  function selectDesign(id) {
    if (active) finishLine();
    design = Frame.designs.get(id);
    if (!design) return;
    picker.value = id;
    sizeLabel.textContent = `${design.width} × ${design.height}`;
    board.setAttribute("aria-label", `${design.name} interface design`);
    designCanvas.setAttribute("aria-label", `${design.name} painted interface`);
    feedback = load();
    lines = feedback.lines;
    pointLimitReached = false;
    paintDesign();
    fitBoard();
    try { localStorage.setItem("frame-last-design", id); } catch { /* optional */ }
  }
  function finishLine() {
    if (!active) return;
    if (active.length === 1) active.push([active[0][0] + 0.1, active[0][1] + 0.1]);
    activePath.setAttribute("d", pathData(active));
    active = null;
    activePath = null;
    const pointerId = activePointerId;
    activePointerId = null;
    if (brush.hasPointerCapture(pointerId)) brush.releasePointerCapture(pointerId);
    save();
  }

  brush.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || activePointerId !== null) return;
    event.preventDefault();
    if (lines.length >= MAX_LINES) {
      updateControls();
      return;
    }
    pointLimitReached = false;
    active = [pointFromEvent(event)];
    activePointerId = event.pointerId;
    lines.push(active);
    activePath = makePath(active);
    brush.setPointerCapture(event.pointerId);
    updateControls();
  });
  function updateActive(event) {
    if (!active || event.pointerId !== activePointerId) return;
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
            finishLine();
            return;
          }
        }
      }
    }
    activePath.setAttribute("d", pathData(active));
  }
  brush.addEventListener("pointermove", updateActive);
  brush.addEventListener("pointerup", (event) => {
    if (event.pointerId !== activePointerId) return;
    updateActive(event);
    finishLine();
  });
  function finishPointer(event) {
    if (event.pointerId === activePointerId) finishLine();
  }
  brush.addEventListener("pointercancel", finishPointer);
  brush.addEventListener("lostpointercapture", finishPointer);
  undo.addEventListener("click", () => {
    finishLine();
    lines.pop();
    pointLimitReached = false;
    redrawMarks();
    save();
  });
  clear.addEventListener("click", () => {
    finishLine();
    lines = [];
    pointLimitReached = false;
    redrawMarks();
    save();
  });
  retrySave.addEventListener("click", save);
  download.addEventListener("click", () => {
    const data = JSON.stringify({design: design.id, width: design.width, height: design.height, lines}, null, 2);
    const url = URL.createObjectURL(new Blob([data], {type: "application/json"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${design.id}-feedback.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  picker.addEventListener("change", () => selectDesign(picker.value));
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && lines.length) {
      event.preventDefault(); undo.click();
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (active || pendingFeedback.size) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  for (const item of Frame.designs.values()) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    picker.append(option);
  }
  if (!Frame.designs.size) throw new Error("Frame needs at least one registered design");
  let initial;
  try { initial = localStorage.getItem("frame-last-design"); } catch { /* optional */ }
  selectDesign(Frame.designs.has(initial) ? initial : Frame.designs.keys().next().value);
  new ResizeObserver(fitBoard).observe(stage);
  window.addEventListener("resize", fitBoard);
})();
