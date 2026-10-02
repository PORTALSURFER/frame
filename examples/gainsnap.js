// GainSnap's current 250 x 424 GPUI layout, recreated as editable Canvas code.
// Geometry/colors: gainsnap/src/gui_gpui.rs; reference: native render 2026-09-29.
// Preview states are visual fixtures, not audio processing or plug-in controls.
(() => {
  const C = {bg: '#1b1e1e', border: '#282b2b', ring: '#404342',
    accent: '#e95843', rms: '#4ab9ae', text: '#d8d7d3', muted: '#999b9a'};
  const G = {width: 250, height: 424, trackX: 60, trackY: 17,
    trackWidth: 22, trackHeight: 356, knobX: 186, knobY: 347};
  let preview = 'listening';
  const states = {idle: {level: -120, active: false, label: '', stage: -1},
    listening: {level: -12, active: true, label: 'Listening', stage: 0},
    adjusting: {level: -12, active: true, label: 'Adjusting', stage: 1},
    matched: {level: -12, active: true, label: 'Matched', stage: 2}};
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
  Frame.register({
    id: 'gainsnap', name: 'GainSnap — current UI', width: G.width, height: G.height,
    paint(ctx) {
      const state = states[preview];
      ctx.save(); box(ctx, 0, 0, G.width, G.height, C.bg);
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
        const y = Math.max(19, Math.min(369, 373 - fraction(db) * 356));
        text(ctx, label, 42, y, 8, 'rgba(153,155,154,.75)', 'right');
      }
      const targetY = markerY(-12);
      box(ctx, G.trackX, targetY, 22, 1, 'rgba(216,215,211,.87)');
      triangle(ctx, 55, targetY, 1); // Left target marker.
      triangle(ctx, 87, markerY(-12), -1); // Right Gain marker, 0 dB at -12.
      // Peak/RMS selectors and live readouts. RMS is the current default mode.
      circle(ctx, 142.5, 24, 4, C.accent);
      circle(ctx, 142.5, 42, 4.5, C.rms, 1, true);
      text(ctx, `PEAK ${state.level.toFixed(1)} dB`, 153, 24, 10, C.accent);
      text(ctx, `RMS  ${state.level.toFixed(1)} dB`, 153, 42, 10, C.rms);
      if (state.active) text(ctx, state.label, 186, 66, 11, C.text, 'center');
      // Coarse gain knob with the thicker inner drag ring and separate value.
      circle(ctx, G.knobX, G.knobY, 35.5, C.ring);
      circle(ctx, G.knobX, G.knobY, 24.5, C.ring, 3);
      line(ctx, G.knobX, G.knobY - 25, G.knobX, G.knobY - 32,
        'rgba(216,215,211,.6)', 2);
      text(ctx, '+0.0', G.knobX, 398, 13, C.text, 'center');
      // Target field, Match action and Restart action, matching source geometry.
      box(ctx, 16, 381, 58, 28, null, C.border);
      text(ctx, '-12.0', 45, 395, 13, C.text, 'center');
      box(ctx, 77, 381, 23, 28, state.active ? C.accent : C.bg,
        state.active ? C.accent : C.border);
      const matchColor = state.active ? C.text : C.accent;
      circle(ctx, 88.5, 395, 5.5, matchColor);
      circle(ctx, 88.5, 395, 3, matchColor);
      box(ctx, 103, 381, 23, 28, null, C.border);
      ctx.save(); ctx.globalAlpha = state.active ? 1 : .45;
      ctx.beginPath(); ctx.arc(114.5, 395, 6, -.9, 4.7);
      ctx.strokeStyle = C.text; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(114.5, 386.5); ctx.lineTo(119, 389);
      ctx.lineTo(114.5, 391); ctx.stroke(); ctx.restore();
      // Full-width three-stage activity rail.
      const segment = (G.width - 6) / 3;
      for (let i = 0; i < 3; i++)
        box(ctx, i * (segment + 3), 417, segment, 4,
          state.stage === i ? C.accent : C.ring);
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
