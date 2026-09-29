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
  const nodes = [0, 200, 400, 500, 700, 900, 1100].map(cents => ({cents}));

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
  function panel(ctx, x, y, w, h, eyebrow) {
    surface(ctx, x, y, w, h, 12);
    text(ctx, eyebrow.toUpperCase(), x + 22, y + 28, 10, C.muted, MONO, "left", 600);
    line(ctx, x + 20, y + 60, x + w - 20, y + 60, C.lineSoft);
  }
  function metalPanel(ctx, points, { reverse = false, reflection = null } = {}) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const shade = ctx.createLinearGradient(minX, reverse ? maxY : minY, maxX, reverse ? minY : maxY);
    shade.addColorStop(0, reverse ? "#39463e" : "#2e3933");
    shade.addColorStop(.6, "#354139");
    shade.addColorStop(1, reverse ? "#2d3832" : "#3b473f");
    ctx.fillStyle = shade;
    ctx.fill();
    if (reflection) {
      const sheen = ctx.createLinearGradient(...reflection);
      sheen.addColorStop(0, "rgba(188, 207, 193, 0)");
      sheen.addColorStop(.3, "rgba(188, 207, 193, .025)");
      sheen.addColorStop(.46, "rgba(188, 207, 193, .17)");
      sheen.addColorStop(.57, "rgba(188, 207, 193, .055)");
      sheen.addColorStop(.85, "rgba(188, 207, 193, 0)");
      sheen.addColorStop(1, "rgba(188, 207, 193, 0)");
      ctx.fillStyle = sheen;
      ctx.fill();
    }
    ctx.strokeStyle = "#151d19";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  function perimeter(ctx) {
    const points = [
      [10, 10], [680, 10], [716, 23], [884, 23], [920, 10], [1590, 10],
      [1590, 448], [1571, 460], [1571, 602], [1590, 614], [1590, 992],
      [920, 992], [884, 979], [716, 979], [680, 992], [10, 992],
      [10, 614], [29, 602], [29, 460], [10, 448]
    ];
    ctx.save();
    metalPanel(ctx, [[652,0],[948,0],[884,23],[716,23]], { reflection: [718,-24,788,46] });
    metalPanel(ctx, [[716,979],[884,979],[942,1000],[658,1000]], { reverse: true });
    metalPanel(ctx, [[0,442],[29,460],[29,602],[0,620]], { reverse: true });
    metalPanel(ctx, [[1571,460],[1600,442],[1600,620],[1571,602]], { reflection: [1550,464,1620,534] });
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
    ctx.strokeStyle = "rgba(184, 200, 186, .16)";
    ctx.lineWidth = 1.1;
    for (const [[x1, y1], [x2, y2]] of accents) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    ctx.restore();
  }
  function button(ctx, x, y, w, h, caption, active = false, small = false) {
    box(ctx, x, y, w, h, active ? SELECTED_FILL : C.raised, active ? C.coralSoft : C.line, 7);
    text(ctx, caption, x + w / 2, y + h / 2 + .5, small ? 12 : 13,
      active ? C.coral : C.muted, MONO, "center", active ? 600 : 500);
  }
  function progressBar(ctx, x, y, w, value, caption, detail) {
    text(ctx, caption.toUpperCase(), x, y - 19, 10, C.muted, MONO, "left", 500);
    text(ctx, detail, x + w, y - 19, 11, C.text, MONO, "right", 500);
    box(ctx, x, y, w, 6, "#2b3530", null, 3);
    box(ctx, x, y, w * value, 6, C.coral, null, 3);
  }

  const INITIAL_LANDSCAPE_POINTS = [
    [.20,.69], [.24,.64], [.29,.53], [.33,.60], [.36,.45], [.40,.56], [.44,.50], [.47,.34],
    [.50,.43], [.53,.31], [.55,.38], [.57,.23], [.59,.35], [.61,.27], [.63,.42], [.65,.32],
    [.67,.36], [.68,.49], [.69,.29], [.70,.41], [.71,.34], [.73,.38], [.75,.48], [.77,.31],
    [.79,.45], [.81,.40], [.83,.55], [.86,.51], [.89,.59], [.58,.56], [.46,.63], [.31,.72]
  ];
  const landscapeDots = INITIAL_LANDSCAPE_POINTS.map(([x, y], index) => ({x, y, root: index === 21}));
  function paintLandscapeContours(ctx, gx, gy, gw, gh, dots) {
    const contourCount = 20;
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
      ctx.strokeStyle = "rgba(196, 204, 197, .12)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  // Static field shapes; node management belongs in a row context menu.
  function paintNodeList(ctx) {
    text(ctx, "NODE", 64, 180, 10, C.muted);
    text(ctx, "PITCH · Hz", 144, 180, 10, C.muted);
    text(ctx, "CENTS", 458, 180, 10, C.muted);
    nodes.forEach((node, index) => {
      const y = 197 + index * 32;
      text(ctx, String(index + 1).padStart(2, "0"), 64, y + 13, 12, index === 4 ? C.coral : C.muted);
      box(ctx, 132, y, 292, 26, C.panelAlt, C.line, 5);
      box(ctx, 446, y, 322, 26, C.panelAlt, C.line, 5);
      text(ctx, (220 * 2 ** (node.cents / 1200)).toFixed(2), 144, y + 13, 12);
      text(ctx, String(node.cents), 458, y + 13, 12);
    });
  }

  function paintFreqs(ctx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    // Top navigation
    text(ctx, "freqs", 40, 54, 36, C.coral, SANS, "left", 500);
    text(ctx, "MTS-ESP TUNING SYSTEM", 190, 56, 10, C.muted, MONO, "left", 600);
    line(ctx, 344, 35, 344, 76, C.line);
    line(ctx, 1110, 35, 1110, 76, C.line);
    circle(ctx, 1142, 55, 4, C.mint);
    text(ctx, "MTS-ESP", 1156, 55, 11, C.text, MONO, "left", 600);
    text(ctx, "CONNECTED", 1244, 55, 9, C.mint, MONO, "left", 600);
    line(ctx, 1360, 35, 1360, 76, C.line);
    button(ctx, 1380, 38, 38, 34, "⚙", false, true);
    button(ctx, 1428, 38, 38, 34, "?", false, true);

    // Main analysis panels
    panel(ctx, 34, 104, 756, 336, "01  /  Nodes");
    paintNodeList(ctx);
    panel(ctx, 810, 104, 756, 336, "02  /  Pitch space");
    text(ctx, "REACH", 1201, 138, 10, C.muted, MONO, "left", 600);
    text(ctx, "±72¢", 1256, 138, 11, C.text, MONO, "left", 600);
    box(ctx, 1310, 135, 210, 5, "#2d3832", null, 3);
    box(ctx, 1310, 135, 74, 5, C.coral, null, 3);
    const gx = 834, gy = 190, gw = 704, gh = 218;
    ctx.save(); ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 6); ctx.clip();
    paintLandscapeContours(ctx, gx, gy, gw, gh, landscapeDots);
    landscapeDots.forEach((point, i) => {
      const x = gx + point.x * gw, y = gy + point.y * gh;
      if (point.root) circle(ctx, x, y, 11, "rgba(255,105,95,.16)", C.coral, 2.5);
      circle(ctx, x, y, i % 7 === 0 ? 4.5 : 3.5, i % 5 === 0 || point.root ? "#ff9a83" : "#d88978");
      if (point.root) {
        box(ctx, x + 17, y - 20, 103, 22, "rgba(14, 19, 18, .88)", C.lineSoft, 4);
        text(ctx, "CURRENT SCALE", x + 24, y - 9, 9, C.text, MONO, "left", 600);
      }
    });
    ctx.restore();
    box(ctx, 1498, 397, 42, 28, C.raised, C.line, 6);
    box(ctx, 1510, 402, 18, 18, null, C.muted, 3);
    for (const [x, y] of [[1514,406],[1524,406],[1519,411],[1514,416],[1524,416]]) {
      circle(ctx, x, y, 1.3, C.muted);
    }

    // Pitch distribution ruler
    panel(ctx, 34, 460, 1532, 142, "03  /  Cent deviation");
    const py = 548, left = 100, right = 1500;
    line(ctx, left, py, right, py, "#536159", 1.5);
    const minCents = Math.min(0, ...nodes.map(node => node.cents));
    const maxCents = Math.max(1200, ...nodes.map(node => node.cents));
    nodes.forEach((node, i) => {
      const x = left + (node.cents - minCents) / (maxCents - minCents) * (right - left);
      const isEnd = i === 0;
      const selected = i === 4;
      circle(ctx, x, py, isEnd ? 8 : 6, isEnd ? C.coral : selected ? C.panel : C.white,
        selected ? C.coralSoft : null, selected ? 2.5 : 1);
      if (selected) circle(ctx, x, py, 2, C.coral);
      text(ctx, String(i + 1), x, py - 23, 11, selected ? C.coral : C.muted, MONO, "center", 600);
      text(ctx, `${node.cents > 0 ? "+" : ""}${Number(node.cents.toFixed(1))}¢`, x, 577, 10, selected ? C.coral : C.muted, MONO, "center", selected ? 600 : 500);
    });

    // Detailed controls
    panel(ctx, 34, 622, 756, 256, "04  /  Reference");
    text(ctx, "ROOT DEGREE", 56, 710, 10, C.muted, MONO, "left", 600);
    text(ctx, "ROOT PITCH", 310, 710, 10, C.muted, MONO, "left", 600);
    text(ctx, "MIDI KEY", 653, 710, 10, C.muted, MONO, "left", 600);
    button(ctx, 56, 724, 36, 34, "‹", false, true);
    text(ctx, "04", 111, 741, 15, C.text, MONO, "center", 600);
    button(ctx, 130, 724, 36, 34, "›", false, true);
    progressBar(ctx, 310, 749, 250, .42, "", "220.00 Hz");
    button(ctx, 653, 724, 36, 34, "‹", false, true);
    text(ctx, "60", 707, 741, 15, C.text, MONO, "center", 600);
    button(ctx, 727, 724, 36, 34, "›", false, true);
    text(ctx, "OCTAVE / REPEAT", 56, 790, 10, C.muted, MONO, "left", 600);
    text(ctx, "1200¢   2.000:1", 768, 790, 10, C.text, MONO, "right", 500);
    progressBar(ctx, 56, 823, 712, .34, "", "");
    text(ctx, "SNAP RATIOS", 56, 852, 10, C.muted, MONO, "left", 500);
    button(ctx, 684, 837, 84, 28, "OFF  ⌄", false, true);

    panel(ctx, 810, 622, 756, 256, "05  /  Slots & structure");
    text(ctx, "NOTES PER REPEAT", 833, 710, 10, C.muted, MONO, "left", 600);
    button(ctx, 833, 724, 40, 36, "−", false, true);
    button(ctx, 881, 724, 40, 36, "+", false, true);
    box(ctx, 933, 724, 54, 36, SELECTED_FILL, C.coralSoft, 7);
    text(ctx, "07", 960, 742, 13, C.coral, MONO, "center", 600);
    [12, 24, 36, 48].forEach((n, i) => button(ctx, 1040 + i * 124, 724, 110, 36, String(n), false, true));
    line(ctx, 833, 781, 1542, 781, C.lineSoft);
    button(ctx, 833, 798, 39, 34, "‹", false, true);
    button(ctx, 880, 798, 39, 34, "›", false, true);
    box(ctx, 930, 798, 320, 34, C.panelAlt, C.line, 7);
    text(ctx, "SLOT 01", 946, 815, 10, C.muted, MONO, "left", 600);
    text(ctx, "•", 1019, 815, 12, C.dim, MONO, "center");
    text(ctx, "EMPTY", 1046, 815, 10, C.dim, MONO, "left", 500);
    button(ctx, 1263, 798, 130, 34, "↓  SAVE", false, true);
    button(ctx, 1406, 798, 136, 34, "□  LOAD", false, true);

    // Full-width audition strip with evenly spaced controls.
    surface(ctx, 34, 896, 1532, 68, 10);
    text(ctx, "AUDITION", 56, 930, 10, C.coral, MONO, "left", 700);
    button(ctx, 142, 914, 38, 34, "△", true, true);
    button(ctx, 190, 914, 38, 34, "▧", false, true);
    button(ctx, 238, 914, 38, 34, "／", false, true);
    line(ctx, 300, 910, 300, 950, C.line);
    progressBar(ctx, 330, 932, 366, .25, "LEVEL", "25%");
    line(ctx, 722, 910, 722, 950, C.line);
    progressBar(ctx, 754, 932, 366, .08, "ATTACK", "10 ms");
    line(ctx, 1146, 910, 1146, 950, C.line);
    progressBar(ctx, 1178, 932, 366, .29, "RELEASE", "900 ms");
    perimeter(ctx);
  }

  Frame.register({ id: "freqs", name: "Freqs tuner concept", width: W, height: H, paint: paintFreqs });


})();
