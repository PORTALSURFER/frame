// GainSnap graphite material concept based on the user's red outline.
// Geometry/colors: gainsnap/src/gui_gpui.rs; reference: native render 2026-09-29.
// Preview states are visual fixtures, not audio processing or plug-in controls.
(() => {
  const C = {bg: '#1b1e1e', border: '#282b2b', ring: '#404342',
    accent: '#e95843', rms: '#4ab9ae', text: '#d8d7d3', muted: '#999b9a'};
  const G = {width: 200, height: 424, trackX: 52, trackY: 24,
    trackWidth: 22, trackHeight: 340, knobX: 203, knobY: 199};
  let preview = 'listening';
  const states = {idle: {level: -120, active: false, label: '', stage: -1},
    listening: {level: -12, active: true, label: 'Listening', stage: 0},
    adjusting: {level: -12, active: true, label: 'Adjusting', stage: 1},
    matched: {level: -12, active: true, label: 'Matched', stage: 2}};
  function gradient(ctx, top, bottom, y, height) {
    const fill = ctx.createLinearGradient(0, y, 0, y + height);
    fill.addColorStop(0, top); fill.addColorStop(1, bottom); return fill;
  }
  function box(ctx, x, y, w, h, fill, stroke) {
    if (fill) {ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);}
    if (stroke) {ctx.strokeStyle = stroke; ctx.lineWidth = 1;
      ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);}
  }
  function line(ctx, x1, y1, x2, y2, color, width = 1) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function circle(ctx, x, y, r, color, width = 1, fill = false) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {ctx.fillStyle = color; ctx.fill();}
    else {ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();}
  }
  function text(ctx, value, x, y, size = 13, color = C.text, align = 'left') {
    ctx.font = `${size}px "Ioskeley Mono", monospace`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
  const fraction = db => Math.max(0, Math.min(1, (db + 36) / 36));
  const markerY = db => G.trackY + 4 + (1 - fraction(db)) * (G.trackHeight - 8);
  function triangle(ctx, x, y, direction) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x - direction * 8, y - 4); ctx.lineTo(x - direction * 8, y + 4);
    ctx.closePath(); ctx.fillStyle = C.text; ctx.fill();
  }
  function roundedPolygon(points, radius) {
    const path = new Path2D();
    const first = points[0], last = points[points.length - 1];
    path.moveTo((first[0] + last[0]) / 2, (first[1] + last[1]) / 2);
    points.forEach(([x, y], i) => {
      const next = points[(i + 1) % points.length];
      path.arcTo(x, y, next[0], next[1], Array.isArray(radius) ? radius[i] : radius);
    });
    path.closePath(); return path;
  }
  function numericField(ctx, value, x, y) {
    const field = new Path2D(); field.roundRect(x - 24, y - 12, 48, 24, 3);
    ctx.fillStyle = gradient(ctx, '#101513', '#1b211e', y - 12, 24); ctx.fill(field);
    ctx.strokeStyle = C.ring; ctx.lineWidth = 1; ctx.stroke(field);
    text(ctx, value, x, y, 12, C.text, 'center');
  }
  Frame.register({
    id: 'gainsnap-recess', name: 'GainSnap — graphite recess', width: G.width, height: G.height,
    paint(ctx) {
      const state = states[preview];
      ctx.save(); box(ctx, 0, 0, G.width, G.height, C.bg);
      const body = roundedPolygon([[2, 2], [198, 2], [198, 125],
        [102, 157], [102, 270], [198, 311], [198, 422], [2, 422]], 8);
      // Paint the recess behind the body so its fill meets both concave
      // corner joins exactly and continues to the window edge.
      // Shallow material contrast keeps the control mounted in the recess.
      box(ctx, 100, 100, 100, 230, gradient(ctx, '#111615', '#1a201e', 100, 230));
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.32)'; ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
      ctx.fillStyle = gradient(ctx, '#292e2d', '#1b1e1e', 0, G.height); ctx.fill(body);
      ctx.restore();
      // Dark empty track reads as an inset beneath the active meter bars.
      box(ctx, G.trackX, G.trackY, G.trackWidth, G.trackHeight, '#0c1010');
      // Output meter: orange Peak on the left, teal RMS on the right.
      if (state.level > -36) {
        const y = markerY(state.level);
        box(ctx, G.trackX, y, 11, G.trackY + G.trackHeight - y, C.accent);
        box(ctx, G.trackX + 11, y, 11, G.trackY + G.trackHeight - y, C.rms);
      }
      box(ctx, G.trackX, G.trackY, G.trackWidth, G.trackHeight, null, C.border);
      for (let i = 0; i < 13; i++) {
        const y = G.trackY + (1 - i / 12) * G.trackHeight;
        const width = i % 2 ? 3 : 4;
        box(ctx, G.trackX - width, y - .5, width, 1, C.border);
      }
      const labels = [['0 dB', 0], ['-6', -6], ['-12', -12], ['-18', -18],
        ['-24', -24], ['-30', -30], ['-∞', -36]];
      for (const [label, db] of labels) {
        const y = G.trackY + (1 - fraction(db)) * G.trackHeight;
        text(ctx, label, 34, y, 8, 'rgba(153,155,154,.75)', 'right');
      }
      const targetY = markerY(-12);
      box(ctx, G.trackX, targetY, 22, 1, 'rgba(216,215,211,.87)');
      triangle(ctx, G.trackX - 5, targetY, 1); // Left target marker.
      triangle(ctx, G.trackX + G.trackWidth + 5, markerY(-12), -1); // Right Gain marker, 0 dB at -12.
      // Close the gap beside the meter by shifting the right-hand assembly.
      ctx.save(); ctx.translate(-50, 0);
      // Peak/RMS selectors and live readouts. RMS is the current default mode.
      circle(ctx, 146, 30, 3, C.accent);
      circle(ctx, 146, 50, 3.5, C.rms, 1, true);
      text(ctx, `PEAK ${state.level.toFixed(1)} dB`, 156, 30, 9, C.accent);
      text(ctx, `RMS  ${state.level.toFixed(1)} dB`, 156, 50, 9, C.rms);
      if (state.active) text(ctx, state.label, G.knobX, 82, 10, C.text, 'center');
      // Muted concentric-ring knob matching the supplied reference.
      circle(ctx, G.knobX, G.knobY, 24.5,
        gradient(ctx, '#202723', '#151b18', G.knobY - 25, 50), 1, true);
      circle(ctx, G.knobX, G.knobY, 35.5,
        gradient(ctx, '#646e66', '#303831', G.knobY - 36, 72), 1);
      circle(ctx, G.knobX, G.knobY, 24.5,
        gradient(ctx, '#697469', '#343e36', G.knobY - 25, 50), 3);
      line(ctx, G.knobX, G.knobY - 32, G.knobX, G.knobY - 26,
        '#9b9e99', 1.5);
      numericField(ctx, '+0.0', G.knobX, G.knobY + 52);
      ctx.restore();
      // Target field directly centered beneath the meter.
      numericField(ctx, '-12.0', G.trackX + 11, 389);
      // Rounded keys preserve the larger Match shape and its diagonal corner.
      const match = roundedPolygon([[118, 338], [160, 338], [160, 401],
        [102, 401], [102, 354]], [10, 5, 5, 5, 10]);
      const rematch = new Path2D(); rematch.roundRect(166, 338, 20, 63, 5);
      function key(path, active) {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.48)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 2;
        ctx.fillStyle = active
          ? gradient(ctx, '#dc694d', '#ad3e29', 338, 63)
          : gradient(ctx, '#3a4340', '#252c29', 338, 63);
        ctx.fill(path); ctx.restore();
        ctx.strokeStyle = '#0c1010'; ctx.lineWidth = 1.5; ctx.stroke(path);
      }
      key(match, state.active); key(rematch, false);
      circle(ctx, 131, 362, 7, C.text, 1.4);
      circle(ctx, 131, 362, 3.5, C.text, 1.2);
      text(ctx, 'MATCH', 131, 386, 9, C.text, 'center');
      ctx.beginPath(); ctx.arc(176, 370, 4.5, -.9, 4.7);
      ctx.strokeStyle = C.text; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(176, 363.25); ctx.lineTo(179, 365.5);
      ctx.lineTo(176, 367.75); ctx.stroke();
      // The narrow Rematch key uses the familiar restart icon only.
      // Full-width three-stage activity rail.
      const segment = (G.width - 22) / 3;
      for (let i = 0; i < 3; i++)
        box(ctx, 8 + i * (segment + 3), 414, segment, 4,
          state.stage === i ? C.accent : C.ring);
      // The window border follows the notch instead of crossing its open edge.
      ctx.strokeStyle = '#090d0d'; ctx.lineWidth = 3; ctx.stroke(body);
      ctx.restore();
    },
    mount({repaint}) {
      const label = document.createElement('label'); label.className = 'design-choice';
      label.append('Preview ');
      const picker = document.createElement('select'); picker.setAttribute('aria-label', 'GainSnap preview');
      for (const [value, state] of Object.entries(states)) {
        const option = document.createElement('option'); option.value = value;
        option.textContent = state.label || 'Idle'; picker.append(option);
      }
      picker.value = preview;
      picker.addEventListener('change', () => {preview = picker.value; repaint();});
      label.append(picker); document.querySelector('.tools').append(label);
      return () => label.remove();
    }
  });
})();
