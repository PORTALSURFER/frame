// A neutral starting point for a new application interface.
(() => {
  function box(ctx, x, y, w, h, radius, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function text(ctx, value, x, y, size = 13, color = "#c9d3d1", weight = 400) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
  }

  Frame.register({
    id: "starter",
    name: "Starter UI",
    width: 960,
    height: 600,
    paint(ctx) {
      ctx.fillStyle = "#171c1d";
      ctx.fillRect(0, 0, 960, 600);
      box(ctx, 18, 18, 924, 564, 16, "#22292a", "#364142");
      box(ctx, 19, 19, 184, 562, [15, 0, 0, 15], "#1d2425");
      ctx.fillStyle = "#364142";
      ctx.fillRect(203, 19, 1, 562);
      text(ctx, "FRAME", 44, 54, 19, "#f2eee5", 700);
      text(ctx, "DESIGN STUDY", 44, 80, 10, "#829391", 600);
      box(ctx, 32, 122, 158, 38, 8, "#34403e");
      text(ctx, "Overview", 48, 141, 13, "#e2eae5", 600);
      for (const [label, y] of [["Components", 190], ["Typography", 230], ["Colors", 270]]) {
        text(ctx, label, 48, y, 13, "#9caaa7");
      }
      text(ctx, "Workspace", 238, 60, 25, "#edf1ed", 650);
      text(ctx, "A code-painted interface ready for a new project.", 238, 90, 12, "#9aa9a6");
      box(ctx, 238, 122, 670, 196, 12, "#293334", "#465352");
      text(ctx, "Main view", 262, 150, 14, "#e2e9e4", 600);
      ctx.strokeStyle = "#53605e";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(262, 176); ctx.lineTo(884, 176); ctx.stroke();
      ctx.strokeStyle = "#77b9aa";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let x = 262; x <= 884; x += 6) {
        const y = 250 - Math.sin((x - 262) / 42) * 18 - Math.sin((x - 262) / 13) * 6;
        if (x === 262) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      box(ctx, 238, 338, 322, 156, 12, "#293334", "#465352");
      box(ctx, 578, 338, 330, 156, 12, "#293334", "#465352");
      text(ctx, "Details", 262, 366, 14, "#e2e9e4", 600);
      text(ctx, "Actions", 602, 366, 14, "#e2e9e4", 600);
      text(ctx, "Use shapes, lines, and type to paint a UI.", 262, 406, 12, "#9caaa7");
      box(ctx, 602, 394, 124, 38, 8, "#78b7a8");
      text(ctx, "Primary", 627, 413, 12, "#14211f", 650);
      box(ctx, 738, 394, 124, 38, 8, "#364443", "#647371");
      text(ctx, "Secondary", 756, 413, 12, "#dce7e1", 600);
      text(ctx, "Edit examples/starter.js to change this design.", 238, 535, 11, "#8fa19d");
    }
  });
})();
