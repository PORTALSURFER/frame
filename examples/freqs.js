// Freqs tuner concept, painted directly onto Frame's design canvas.
(() => {
  const W = 1600;
  const H = 1000;
  const C = {
    bg: "#0d1111", panel: "#131918", panelAlt: "#101615", raised: "#1a2220",
    line: "#303a35", lineSoft: "#252e2a", text: "#edf0e9", muted: "#a9b4ac",
    dim: "#7d8a82", coral: "#ff695f", coralSoft: "#aa514b", mint: "#9ad4ba",
    white: "#f1f2eb"
  };
  const MONO = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';
  const SANS = 'Inter, "Segoe UI", Arial, sans-serif';
  const SELECTED_FILL = "rgba(255, 105, 95, .16)";

  function box(ctx, x, y, w, h, fill, stroke = null, r = 10) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function text(ctx, value, x, y, size = 13, color = C.text, font = MONO, align = "left", weight = 400) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
  function line(ctx, x1, y1, x2, y2, color = C.line, width = 1) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function circle(ctx, x, y, r, fill, stroke = null, sw = 1) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
  }
  function surface(ctx, x, y, w, h, radius = 10) {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
    const fill = ctx.createLinearGradient(x, y, x, y + h);
    fill.addColorStop(0, "#171e1b");
    fill.addColorStop(.48, C.panel);
    fill.addColorStop(1, "#111615");
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.moveTo(x + 12, y + .5); ctx.lineTo(x + w - 12, y + .5);
    ctx.strokeStyle = "rgba(190, 202, 192, .12)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 12, y + h - .5); ctx.lineTo(x + w - 12, y + h - .5);
    ctx.strokeStyle = "rgba(0, 0, 0, .30)"; ctx.stroke();
    ctx.restore();
  }
  function panel(ctx, x, y, w, h, title, eyebrow = "") {
    surface(ctx, x, y, w, h, 12);
    if (eyebrow) text(ctx, eyebrow.toUpperCase(), x + 22, y + 24, 10, C.muted, MONO, "left", 600);
    text(ctx, title, x + 22, y + (eyebrow ? 51 : 30), 17, C.text, SANS, "left", 600);
    line(ctx, x + 20, y + (eyebrow ? 76 : 56), x + w - 20, y + (eyebrow ? 76 : 56), C.lineSoft);
  }
  function insetPlate(ctx, wellPoints, platePoints, innerEdge) {
    const path = (points) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
    };
    path(wellPoints);
    ctx.fillStyle = "#080b0b";
    ctx.fill();
    ctx.strokeStyle = "rgba(3, 6, 6, .9)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const xs = platePoints.map(([x]) => x), ys = platePoints.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const gradients = {
      top: [minX, maxY, minX, minY],
      bottom: [minX, minY, minX, maxY],
      left: [maxX, minY, minX, minY],
      right: [minX, minY, maxX, minY]
    };
    const gradient = ctx.createLinearGradient(...gradients[innerEdge]);
    gradient.addColorStop(0, "#3a4540");
    gradient.addColorStop(.38, "#313b37");
    gradient.addColorStop(1, "#272f2c");
    path(platePoints);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(139, 152, 143, .38)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = "rgba(190, 201, 192, .27)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const [innerStart, innerEnd] = innerEdge === "top" || innerEdge === "bottom"
      ? [platePoints[5], platePoints[6]] : [platePoints[1], platePoints[2]];
    ctx.moveTo(innerStart[0], innerStart[1]);
    ctx.lineTo(innerEnd[0], innerEnd[1]);
    ctx.stroke();
    ctx.restore();
  }
  function perimeter(ctx) {
    const points = [
      [10, 10], [680, 10], [716, 23], [884, 23], [920, 10], [1590, 10],
      [1590, 448], [1571, 460], [1571, 602], [1590, 614], [1590, 992],
      [920, 992], [884, 979], [716, 979], [680, 992], [10, 992],
      [10, 614], [29, 602], [29, 460], [10, 448]
    ];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.strokeStyle = "rgba(164, 177, 168, .30)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const accents = [
      [[680, 10], [716, 23]], [[884, 23], [920, 10]],
      [[1590, 448], [1571, 460]], [[1571, 602], [1590, 614]],
      [[920, 992], [884, 979]], [[716, 979], [680, 992]],
      [[10, 614], [29, 602]], [[29, 460], [10, 448]]
    ];
    ctx.strokeStyle = "rgba(255, 105, 95, .22)";
    ctx.lineWidth = 1.1;
    for (const [[x1, y1], [x2, y2]] of accents) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    insetPlate(ctx,
      [[719,12],[727,11],[873,11],[881,12],[881,21],[873,22],[727,22],[719,21]],
      [[722,14],[728,13],[872,13],[878,14],[878,19],[872,20],[728,20],[722,19]], "top");
    insetPlate(ctx,
      [[719,990],[727,991],[873,991],[881,990],[881,981],[873,980],[727,980],[719,981]],
      [[722,988],[728,989],[872,989],[878,988],[878,983],[872,982],[728,982],[722,983]], "bottom");
    insetPlate(ctx,
      [[12,462],[25,468],[25,594],[12,600]],
      [[14,464],[23,470],[23,592],[14,598]], "left");
    insetPlate(ctx,
      [[1588,462],[1575,468],[1575,594],[1588,600]],
      [[1586,464],[1577,470],[1577,592],[1586,598]], "right");
    ctx.restore();
  }
  function button(ctx, x, y, w, h, caption, active = false, small = false) {
    box(ctx, x, y, w, h, active ? SELECTED_FILL : C.raised, active ? C.coralSoft : C.line, 7);
    text(ctx, caption, x + w / 2, y + h / 2 + .5, small ? 12 : 13,
      active ? C.coral : C.muted, MONO, "center", active ? 600 : 500);
  }
  function slider(ctx, x, y, w, value, caption, detail) {
    text(ctx, caption.toUpperCase(), x, y - 19, 10, C.muted, MONO, "left", 500);
    text(ctx, detail, x + w, y - 19, 11, C.text, MONO, "right", 500);
    box(ctx, x, y, w, 6, "#2b3530", null, 3);
    box(ctx, x, y, w * value, 6, C.coral, null, 3);
    box(ctx, x + w * value - 2, y - 5, 4, 16, C.text, null, 2);
  }

  const INITIAL_LANDSCAPE_POINTS = [
    [.20,.69], [.24,.64], [.29,.53], [.33,.60], [.36,.45], [.40,.56], [.44,.50], [.47,.34],
    [.50,.43], [.53,.31], [.55,.38], [.57,.23], [.59,.35], [.61,.27], [.63,.42], [.65,.32],
    [.67,.36], [.68,.49], [.69,.29], [.70,.41], [.71,.34], [.73,.38], [.75,.48], [.77,.31],
    [.79,.45], [.81,.40], [.83,.55], [.86,.51], [.89,.59], [.58,.56], [.46,.63], [.31,.72]
  ];
  let landscapeDots = INITIAL_LANDSCAPE_POINTS.map(([x, y], index) => ({x, y, root: index === 21}));
  let landscapeSeed = 0x5eed;

  function variationDots(seed) {
    let state = seed >>> 0;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const centerX = .62 + random() * .15;
    const centerY = .30 + random() * .20;
    const satelliteX = .27 + random() * .21;
    const satelliteY = .58 + random() * .20;
    const spread = () => random() + random() + random() - 1.5;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    return Array.from({length: 32}, (_, index) => {
      if (index === 21) {
        return {x: centerX, y: centerY, root: true};
      }
      const satellite = random() > .78;
      const cx = satellite ? satelliteX : centerX;
      const cy = satellite ? satelliteY : centerY;
      return {
        x: clamp(cx + spread() * (satellite ? .13 : .12), .10, .91),
        y: clamp(cy + spread() * (satellite ? .15 : .14), .12, .86),
        root: false
      };
    });
  }

  function paintLandscapeContours(ctx, gx, gy, gw, gh, dots) {
    const contourCount = 28;
    const sampleCount = 136;
    const sigmaX = gw * .09;
    const sigmaY = gh * .12;
    for (let contour = 0; contour < contourCount; contour++) {
      const level = (contour + .5) / contourCount;
      ctx.beginPath();
      for (let sample = 0; sample <= sampleCount; sample++) {
        const t = sample / sampleCount;
        const x = gx + t * gw;
        const baseline = gy + level * gh + Math.sin(t * 5.4 + contour * .17) * 2.2;
        let deformation = 0;
        for (const dot of dots) {
          const dx = (x - (gx + dot.x * gw)) / sigmaX;
          const dy = (baseline - (gy + dot.y * gh)) / sigmaY;
          deformation += dy * 13 * Math.exp(-.5 * (dx * dx + dy * dy));
        }
        const y = baseline + Math.max(-27, Math.min(27, deformation));
        if (sample === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(196, 204, 197, .15)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function paintFreqs(ctx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    // Top navigation
    text(ctx, "freqs", 40, 54, 36, C.coral, SANS, "left", 500);
    text(ctx, "MTS-ESP TUNING SYSTEM", 190, 56, 10, C.muted, MONO, "left", 600);
    line(ctx, 344, 35, 344, 76, C.line);
    text(ctx, "EXPLORE", 928, 55, 11, C.dim, MONO, "center", 600);
    text(ctx, "TUNE", 1054, 55, 11, C.text, MONO, "center", 700);
    box(ctx, 1028, 76, 52, 3, C.coral, null, 2);
    line(ctx, 1110, 35, 1110, 76, C.line);
    circle(ctx, 1142, 55, 4, C.mint);
    text(ctx, "MTS-ESP", 1156, 55, 11, C.text, MONO, "left", 600);
    text(ctx, "CONNECTED", 1244, 55, 9, C.mint, MONO, "left", 600);
    line(ctx, 1360, 35, 1360, 76, C.line);
    button(ctx, 1380, 38, 38, 34, "⚙", false, true);
    button(ctx, 1428, 38, 38, 34, "?", false, true);
    text(ctx, "SESSION 04", 1558, 55, 10, C.dim, MONO, "right", 500);

    // Main analysis panels
    panel(ctx, 34, 104, 530, 336, "Note lattice", "01  /  Harmonic map");
    text(ctx, "PARTIALS", 55, 198, 10, C.muted, MONO, "left", 600);
    for (let col = 0; col < 8; col++) text(ctx, String(col + 1).padStart(2, "0"), 153 + col * 48, 198, 10, C.muted, MONO, "center");
    for (let row = 0; row < 5; row++) {
      const y = 231 + row * 36;
      text(ctx, ["ROOT", "OCT 2", "OCT 3", "OCT 4", "OCT 5"][row], 55, y, 10, C.muted, MONO, "left", 500);
      for (let col = 0; col < 8; col++) {
        const x = 153 + col * 48;
        const strength = ((row * 5 + col * 3 + 2) % 9) / 9;
        const isRoot = row === 0 && col === 3;
        const isSelected = (row === 2 && col === 5) || (row === 4 && col === 1);
        const radius = 8 + strength * 3;
        circle(ctx, x, y, radius, isSelected ? SELECTED_FILL : `rgba(255,105,95,${.08 + strength * .26})`);
        if (isRoot || isSelected) circle(ctx, x, y, radius + 3, null, isRoot ? C.coral : C.coralSoft, isRoot ? 2 : 1.5);
        circle(ctx, x, y, 2, isRoot || isSelected ? C.coral : "rgba(220,229,220,.38)");
      }
    }
    line(ctx, 54, 416, 544, 416, C.lineSoft);
    circle(ctx, 61, 428, 4, C.coral);
    text(ctx, "ROOT", 72, 428, 10, C.muted, MONO, "left", 500);
    circle(ctx, 136, 428, 4, C.coralSoft);
    text(ctx, "CANDIDATE PARTIAL", 147, 428, 10, C.muted, MONO, "left", 500);
    text(ctx, "7 ACTIVE", 542, 428, 10, C.coral, MONO, "right", 600);

    panel(ctx, 582, 104, 984, 336, "Scale landscape", "02  /  Pitch space");
    text(ctx, "REACH", 1201, 138, 10, C.muted, MONO, "left", 600);
    text(ctx, "±72¢", 1256, 138, 11, C.text, MONO, "left", 600);
    box(ctx, 1310, 135, 210, 5, "#2d3832", null, 3);
    box(ctx, 1310, 135, 74, 5, C.coral, null, 3);
    box(ctx, 1380, 130, 4, 15, C.coral, null, 2);
    const gx = 606, gy = 190, gw = 932, gh = 218;
    ctx.save(); ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 6); ctx.clip();
    paintLandscapeContours(ctx, gx, gy, gw, gh, landscapeDots);
    landscapeDots.forEach((point, i) => {
      const x = gx + point.x * gw, y = gy + point.y * gh;
      if (point.root) circle(ctx, x, y, 11, "rgba(255,105,95,.16)", C.coral, 2.5);
      circle(ctx, x, y, i % 7 === 0 ? 4.5 : 3.5, i % 5 === 0 || point.root ? "#ff9a83" : "#d88978");
    });
    ctx.restore();
    text(ctx, "−600¢", gx, 426, 10, C.dim, MONO, "left");
    text(ctx, "0¢", gx + gw / 2, 426, 10, C.dim, MONO, "center");
    text(ctx, "+600¢", gx + gw, 426, 10, C.dim, MONO, "right");
    button(ctx, 1420, 397, 120, 28, "↻  RESHUFFLE", false, true);

    // Pitch distribution ruler
    panel(ctx, 34, 460, 1532, 142, "Pitch line", "03  /  Cent deviation");
    const py = 548, left = 100, right = 1500;
    line(ctx, left, py, right, py, "#536159", 1.5);
    const ticks = [0, .17, .34, .43, .61, .74, .91, 1];
    const cents = ["0¢", "+200¢", "+400¢", "+500¢", "+700¢", "+900¢", "+1100¢", "+1200¢"];
    ticks.forEach((t, i) => {
      const x = left + t * (right - left);
      const isEnd = i === 0 || i === ticks.length - 1;
      const selected = i === 4;
      circle(ctx, x, py, isEnd ? 8 : 6, isEnd ? C.coral : selected ? C.panel : C.white,
        selected ? C.coralSoft : null, selected ? 2.5 : 1);
      if (selected) circle(ctx, x, py, 2, C.coral);
      text(ctx, cents[i], x, 577, 10, selected ? C.coral : C.muted, MONO, "center", selected ? 600 : 500);
    });

    // Detailed controls
    panel(ctx, 34, 622, 535, 256, "Tuning", "04  /  Reference");
    text(ctx, "ROOT DEGREE", 56, 710, 10, C.muted, MONO, "left", 600);
    text(ctx, "ROOT PITCH", 240, 710, 10, C.muted, MONO, "left", 600);
    text(ctx, "MIDI KEY", 422, 710, 10, C.muted, MONO, "left", 600);
    button(ctx, 56, 724, 36, 34, "‹", false, true);
    text(ctx, "04", 111, 741, 15, C.text, MONO, "center", 600);
    button(ctx, 130, 724, 36, 34, "›", false, true);
    slider(ctx, 240, 749, 150, .42, "", "220.00 Hz");
    button(ctx, 422, 724, 36, 34, "‹", false, true);
    text(ctx, "60", 476, 741, 15, C.text, MONO, "center", 600);
    button(ctx, 496, 724, 36, 34, "›", false, true);
    text(ctx, "OCTAVE / REPEAT", 56, 790, 10, C.muted, MONO, "left", 600);
    text(ctx, "1200¢   2.000:1", 547, 790, 10, C.text, MONO, "right", 500);
    slider(ctx, 56, 823, 490, .34, "", "");
    text(ctx, "SNAP RATIOS", 56, 852, 10, C.muted, MONO, "left", 500);
    button(ctx, 462, 837, 84, 28, "OFF  ⌄", false, true);

    panel(ctx, 589, 622, 583, 256, "Scale", "05  /  Slots & structure");
    text(ctx, "NOTES PER REPEAT", 612, 710, 10, C.muted, MONO, "left", 600);
    button(ctx, 612, 724, 40, 36, "−", false, true);
    button(ctx, 660, 724, 40, 36, "+", false, true);
    [7, 12, 24, 36, 48].forEach((n, i) => button(ctx, 712 + i * 53, 724, 45, 36, String(n), i === 0, true));
    line(ctx, 612, 781, 1148, 781, C.lineSoft);
    button(ctx, 612, 798, 39, 34, "‹", false, true);
    button(ctx, 659, 798, 39, 34, "›", false, true);
    box(ctx, 709, 798, 206, 34, C.panelAlt, C.line, 7);
    text(ctx, "SLOT 01", 725, 815, 10, C.muted, MONO, "left", 600);
    text(ctx, "•", 798, 815, 12, C.dim, MONO, "center");
    text(ctx, "EMPTY", 825, 815, 10, C.dim, MONO, "left", 500);
    button(ctx, 928, 798, 105, 34, "↓  SAVE", false, true);
    button(ctx, 1042, 798, 106, 34, "□  LOAD", false, true);

    panel(ctx, 1192, 622, 374, 256, "Scale stats", "06  /  Quality");
    const stats = [["COHESION", "47%", .47], ["ROOT GRAVITY", "49%", .49], ["ENERGY", "61%", .61], ["PAIR FIT", "66%", .66]];
    stats.forEach(([name, value, amount], i) => {
      const y = 716 + i * 35;
      text(ctx, name, 1215, y, 10, C.muted, MONO, "left", 500);
      box(ctx, 1350, y - 2, 105, 4, "#29332f", null, 2);
      box(ctx, 1350, y - 2, 105 * amount, 4, i === 0 ? C.coral : "#b4bfb5", null, 2);
      text(ctx, value, 1541, y, 10, C.text, MONO, "right", 600);
    });
    line(ctx, 1215, 850, 1542, 850, C.lineSoft);
    text(ctx, "ROOT SHAPE", 1215, 864, 9, C.muted, MONO, "left", 500);
    text(ctx, "1—2—5", 1541, 864, 11, C.text, MONO, "right", 600);

    // Compact, aligned audition strip
    surface(ctx, 34, 896, 1532, 68, 10);
    text(ctx, "AUDITION", 56, 930, 10, C.coral, MONO, "left", 700);
    button(ctx, 142, 914, 38, 34, "△", true, true);
    button(ctx, 190, 914, 38, 34, "▧", false, true);
    button(ctx, 238, 914, 38, 34, "／", false, true);
    line(ctx, 300, 910, 300, 950, C.line);
    slider(ctx, 330, 932, 196, .25, "LEVEL", "25%");
    line(ctx, 550, 910, 550, 950, C.line);
    slider(ctx, 582, 932, 205, .08, "ATTACK", "10 ms");
    line(ctx, 812, 910, 812, 950, C.line);
    slider(ctx, 844, 932, 205, .29, "RELEASE", "900 ms");
    line(ctx, 1074, 910, 1074, 950, C.line);
    text(ctx, "AUDITION VOICE", 1540, 930, 10, C.dim, MONO, "right", 500);
    text(ctx, "FREQS  /  TUNING ENVIRONMENT", 38, 986, 9, C.dim, MONO, "left", 500);
    text(ctx, "CONCEPT UI    •    03.2", 1562, 986, 9, C.dim, MONO, "right", 500);
    perimeter(ctx);
  }

  Frame.register({ id: "freqs", name: "Freqs tuner concept", width: W, height: H, paint: paintFreqs });

  // Frame designs are paint-only. Capture the variation control before the
  // annotation brush sees the pointer, then repaint this design in place.
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("design");
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || document.getElementById("design-picker").value !== "freqs") return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * W;
    const y = (event.clientY - bounds.top) / bounds.height * H;
    if (x < 1420 || x > 1540 || y < 397 || y > 425) return;
    event.preventDefault();
    event.stopPropagation();
    landscapeDots = variationDots(++landscapeSeed);
    const context = canvas.getContext("2d");
    const scale = canvas.width / W;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, W, H);
    paintFreqs(context);
  }, true);
})();
