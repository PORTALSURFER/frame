// Example design painted from code. The reference image is never displayed on the canvas.
(() => {
let paint;
const mono = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';

function roundedBox(x, y, width, height, radius, fill, stroke) {
  paint.beginPath();
  paint.roundRect(x, y, width, height, radius);
  if (fill) { paint.fillStyle = fill; paint.fill(); }
  if (stroke) { paint.strokeStyle = stroke; paint.lineWidth = 1; paint.stroke(); }
}

function label(value, x, y, size = 11, color = "#a2aaa6", align = "left") {
  paint.font = `${size}px ${mono}`;
  paint.textAlign = align;
  paint.textBaseline = "middle";
  paint.fillStyle = color;
  paint.fillText(value, x, y);
}

function line(x1, y1, x2, y2, color, width = 1) {
  paint.beginPath();
  paint.moveTo(x1, y1);
  paint.lineTo(x2, y2);
  paint.strokeStyle = color;
  paint.lineWidth = width;
  paint.stroke();
}

function fillButtonWithShadow(shape, color) {
  paint.save();
  paint.fillStyle = color;
  paint.shadowColor = "rgba(0, 0, 0, .24)";
  paint.shadowBlur = 4;
  paint.shadowOffsetY = 2;
  paint.fill(shape);
  paint.restore();
}

const traces = Object.fromEntries(Object.entries(SIFT_WAVE_TRACES).map(([name, bands]) => [
  name,
  Object.fromEntries(Object.entries(bands).map(([key, encoded]) => [key, Uint8Array.from(atob(encoded), character => character.charCodeAt(0))]))
]));
const audioSelection = {start: 220, end: 950, viewStart: 165, viewEnd: 1010, duration: "1.52 s"};
const selectionColors = {
  body: "rgba(113, 65, 77, .16)",
  bar: "rgba(198, 126, 112, .74)",
  edge: "rgba(204, 135, 119, .58)"
};

function paintWave(center, channel, overview = false) {
  const left = 18;
  const right = 1122;
  const bands = channel === 0 ? traces.upper : traces.lower;
  const scale = overview ? .22 : 1;
  line(left, center, right, center, overview ? "rgba(133, 102, 153, .28)" : "rgba(140, 102, 153, .36)");
  for (const inner of [false, true]) {
    const top = bands[inner ? "innerTop" : "outerTop"];
    const bottom = bands[inner ? "innerBottom" : "outerBottom"];
    const waveform = new Path2D();
    waveform.moveTo(left, center - top[left / 2] * scale);
    for (let x = left + 2; x <= right; x += 2) {
      waveform.lineTo(x, center - top[x / 2] * scale);
    }
    for (let x = right; x >= left; x -= 2) {
      waveform.lineTo(x, center + bottom[x / 2] * scale);
    }
    waveform.closePath();
    paint.fillStyle = inner ? "#e6715d" : "#735cac";
    paint.globalAlpha = .94;
    paint.fill(waveform);
  }
  paint.globalAlpha = 1;
}

function paintInset(path, edge, y0, y1, upper) {
  const metal = paint.createLinearGradient(0, y0, 0, y1);
  if (upper) {
    metal.addColorStop(0, "#343a37");
    metal.addColorStop(.6, "#383f3b");
    metal.addColorStop(1, "#3b423e");
  } else {
    metal.addColorStop(0, "#3b423e");
    metal.addColorStop(.4, "#383f3b");
    metal.addColorStop(1, "#343a37");
  }
  paint.fillStyle = metal;
  paint.fill(path);

  // Let the inner lip recede into the metal while the outer edge catches light.
  paint.save();
  paint.clip(path);
  paint.strokeStyle = "rgba(6, 10, 9, .14)";
  paint.lineWidth = 5;
  paint.shadowColor = "rgba(0, 0, 0, .13)";
  paint.shadowBlur = 5;
  paint.stroke(edge);
  paint.strokeStyle = "rgba(8, 13, 11, .08)";
  paint.lineWidth = 7;
  paint.shadowColor = "rgba(0, 0, 0, .09)";
  paint.shadowBlur = 5;
  paint.stroke(edge);
  paint.restore();
  paint.save();
  paint.strokeStyle = "rgba(173, 188, 179, .22)";
  paint.lineWidth = .8;
  paint.shadowColor = "rgba(184, 197, 189, .15)";
  paint.shadowBlur = 3;
  paint.stroke(edge);
  paint.restore();

  const cornerGlints = upper
    ? [
        {edge: "M162 14 L168 17 Q173 20 179 20 H186", x0: 162, x1: 186},
        {edge: "M814 20 H821 Q827 20 831 18 L838 14", x0: 814, x1: 838}
      ]
    : [
        {edge: "M148 486 L153 482 Q158 480 164 480 H171", x0: 148, x1: 171},
        {edge: "M749 480 H756 Q762 480 768 482 L773 486", x0: 749, x1: 773}
      ];
  for (const corner of cornerGlints) {
    const edgeLight = paint.createLinearGradient(corner.x0, 0, corner.x1, 0);
    edgeLight.addColorStop(0, "rgba(201, 215, 205, 0)");
    edgeLight.addColorStop(.5, "rgba(201, 215, 205, .23)");
    edgeLight.addColorStop(1, "rgba(201, 215, 205, 0)");
    paint.strokeStyle = edgeLight;
    paint.lineWidth = 1.1;
    paint.stroke(new Path2D(corner.edge));
  }
}

function paintButton(x, y, width, height, caption, textSize = 11, cutCorner = false) {
  if (cutCorner) {
    const cut = 9;
    const button = new Path2D();
    button.moveTo(x + 4, y);
    button.lineTo(x + width - 4, y);
    button.quadraticCurveTo(x + width, y, x + width, y + 4);
    button.lineTo(x + width, y + height - cut);
    button.lineTo(x + width - cut, y + height);
    button.lineTo(x + 4, y + height);
    button.quadraticCurveTo(x, y + height, x, y + height - 4);
    button.lineTo(x, y + 4);
    button.quadraticCurveTo(x, y, x + 4, y);
    button.closePath();
    fillButtonWithShadow(button, "#272c2a");
    paint.strokeStyle = "#48534d";
    paint.lineWidth = 1;
    paint.stroke(button);
  } else {
    const button = new Path2D();
    button.roundRect(x, y, width, height, 4);
    fillButtonWithShadow(button, "#272c2a");
    paint.strokeStyle = "#363d39";
    paint.lineWidth = 1;
    paint.stroke(button);
  }
  if (caption) label(caption, x + width / 2, y + height / 2 + .5, textSize, "#a2aba5", "center");
}

function paintMainSelection() {
  const {start, end, duration} = audioSelection;
  const selectionBar = new Path2D();
  selectionBar.rect(start, 71, end - start, 15);
  selectionBar.moveTo(start, 71);
  selectionBar.lineTo(start + 24, 71);
  selectionBar.lineTo(start, 95);
  selectionBar.closePath();
  paint.fillStyle = selectionColors.bar;
  paint.fill(selectionBar);
  label(duration, start + 11, 79, 11, "#f0ddd4");
  line(start + .5, 95, start + .5, 376, selectionColors.edge, 1.4);

  const handleEnd = end - 1;
  const handleLeft = handleEnd - 53;
  const handle = new Path2D();
  handle.moveTo(handleLeft, 71);
  handle.lineTo(handleEnd, 71);
  handle.lineTo(handleEnd, 86);
  handle.lineTo(handleEnd - 38, 86);
  handle.closePath();
  paint.save();
  paint.fillStyle = "#3d4641";
  paint.shadowColor = "rgba(0, 0, 0, .2)";
  paint.shadowBlur = 5;
  paint.shadowOffsetX = -3;
  paint.fill(handle);
  paint.restore();
  paint.save();
  paint.clip(handle);
  paint.strokeStyle = "rgba(170, 187, 175, .42)";
  paint.lineWidth = 3;
  paint.stroke(handle);
  paint.restore();
  paint.strokeStyle = "#1d2621";
  paint.lineWidth = 1.5;
  paint.stroke(handle);
  const inset = new Path2D();
  inset.moveTo(handleEnd - 35, 76);
  inset.lineTo(handleEnd - 10, 76);
  inset.lineTo(handleEnd - 10, 81);
  inset.lineTo(handleEnd - 30, 81);
  inset.closePath();
  const insetShade = paint.createLinearGradient(0, 76, 0, 81);
  insetShade.addColorStop(0, "#272e2a");
  insetShade.addColorStop(1, "#2e3631");
  paint.fillStyle = insetShade;
  paint.fill(inset);
  paint.strokeStyle = "#151b18";
  paint.lineWidth = 1;
  paint.stroke(inset);
  line(end + .5, 71, end + .5, 376, selectionColors.edge, 1.4);

  const guide = paint.createLinearGradient(0, 112, 0, 338);
  guide.addColorStop(0, "rgba(205, 174, 162, 0)");
  guide.addColorStop(.35, "rgba(205, 174, 162, .26)");
  guide.addColorStop(.65, "rgba(205, 174, 162, .26)");
  guide.addColorStop(1, "rgba(205, 174, 162, 0)");
  for (let quarter = 1; quarter <= 3; quarter++) {
    const x = start + (end - start) * quarter / 4;
    line(x, 112, x, 338, guide);
  }
}

function paintNavigatorSelection() {
  const {start, end, viewStart, viewEnd} = audioSelection;
  paint.fillStyle = selectionColors.bar;
  paint.fillRect(start, 391, end - start, 7);
  line(start + .5, 391, start + .5, 408, selectionColors.edge, 1.2);
  line(end + .5, 391, end + .5, 408, selectionColors.edge, 1.2);

  const navigationMetal = paint.createLinearGradient(0, 418, 0, 426);
  navigationMetal.addColorStop(0, "rgba(118, 108, 145, .72)");
  navigationMetal.addColorStop(1, "rgba(88, 80, 116, .72)");
  paint.fillStyle = navigationMetal;
  paint.fillRect(viewStart, 418, viewEnd - viewStart, 8);
  paint.fillStyle = "rgba(178, 168, 201, .58)";
  paint.fillRect(viewStart, 418, viewEnd - viewStart, 1.5);
  line(viewStart + .5, 413, viewStart + .5, 426, "rgba(183, 174, 205, .82)", 1.6);
  line(viewEnd + .5, 413, viewEnd + .5, 426, "rgba(183, 174, 205, .82)", 1.6);
}

function paintViewVignette(x, y, width, height, radius, opacity) {
  paint.save();
  paint.beginPath();
  paint.roundRect(x, y, width, height, 3);
  paint.clip();
  for (const cornerX of [x, x + width]) {
    for (const cornerY of [y, y + height]) {
      const shadow = paint.createRadialGradient(cornerX, cornerY, 0, cornerX, cornerY, radius);
      shadow.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
      shadow.addColorStop(.48, `rgba(0, 0, 0, ${opacity * .36})`);
      shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
      paint.fillStyle = shadow;
      paint.fillRect(x, y, width, height);
    }
  }
  paint.restore();
}

function paintSift(context) {
  paint = context;
  paint.fillStyle = "#272a29";
  paint.fillRect(0, 0, 1140, 500);

  const upperEdge = new Path2D("M130 0 L168 17 Q173 20 179 20 H821 Q827 20 831 18 L869 0");
  const lowerEdge = new Path2D("M135 500 L153 482 Q158 480 164 480 H756 Q762 480 768 482 L786 500");
  paintInset(new Path2D("M130 0 L168 17 Q173 20 179 20 H821 Q827 20 831 18 L869 0 Z"), upperEdge, 0, 20, true);
  paintInset(new Path2D("M135 500 L153 482 Q158 480 164 480 H756 Q762 480 768 482 L786 500 Z"), lowerEdge, 480, 500, false);

  label("PORTALSURFER", 30, 51, 15, "#d5d5d0");
  label("/", 163, 51, 16, "#aeb6b1");
  label("SIFT", 190, 51, 15, "#eb6754");
  label("v0.1.45", 1102, 12, 10, "#737c77", "right");
  paintButton(925, 27, 72, 30, "TAKES", 11, true);
  label("⌄", 984, 42, 15, "#8b9490", "center");
  paintButton(1004, 27, 29, 30, "↗", 19, true);
  paintButton(1040, 27, 29, 30, "⚙", 15, true);
  paintButton(1076, 27, 27, 30, "?", 16, true);

  roundedBox(16.5, 70.5, 1107, 306, 3, "#202323", "#4b514e");
  paint.fillStyle = selectionColors.body;
  paint.fillRect(audioSelection.start, 71, audioSelection.end - audioSelection.start, 304);
  line(17, 223, 1123, 223, "rgba(130, 137, 132, .07)");
  line(17, 147, 1123, 147, "rgba(132, 139, 136, .12)");
  line(17, 300, 1123, 300, "rgba(132, 139, 136, .12)");

  paint.save();
  paint.beginPath();
  paint.rect(18, 84, 1104, 276);
  paint.clip();
  paintWave(147, 0);
  paintWave(300, 1);
  paint.restore();

  line(377, 71, 377, 376, "rgba(177, 185, 181, .62)", 1);
  for (const marker of [278, 295, 1068]) {
    paint.beginPath();
    paint.moveTo(marker - 3.5, 73);
    paint.lineTo(marker + 3.5, 73);
    paint.lineTo(marker, 78);
    paint.closePath();
    paint.fillStyle = "#bd886b";
    paint.fill();
    const stem = paint.createLinearGradient(0, 78, 0, 111);
    stem.addColorStop(0, "rgba(189, 136, 107, .28)");
    stem.addColorStop(.4, "rgba(189, 136, 107, .2)");
    stem.addColorStop(1, "rgba(189, 136, 107, 0)");
    line(marker, 78, marker, 111, stem);
  }
  label("0.00s", 27, 364, 10.5, "#9da5a1");
  label("2.38s", 1112, 364, 10.5, "#9da5a1", "right");
  paintMainSelection();
  paintViewVignette(17, 71, 1106, 305, 155, .13);

  roundedBox(16.5, 389.5, 1107, 37, 0, "#202323", "#484e4b");
  paint.fillStyle = selectionColors.body;
  paint.fillRect(audioSelection.start, 391, audioSelection.end - audioSelection.start, 34);
  line(17, 408, 1123, 408, "rgba(134, 142, 137, .17)");
  paint.save();
  paint.beginPath();
  paint.rect(18, 391, 1104, 34);
  paint.clip();
  paintWave(408, 0, true);
  paint.restore();
  paintNavigatorSelection();
  line(377, 390, 377, 426, "rgba(182, 192, 186, .73)");
  paintViewVignette(17, 390, 1106, 36, 91, .09);

  const arm = new Path2D("M32 446 H106 Q111 446 111 451 V472 L100 483 H32 Q27 483 27 478 V451 Q27 446 32 446 Z");
  fillButtonWithShadow(arm, "#313a38");
  paint.strokeStyle = "#7c8984";
  paint.lineWidth = 1;
  paint.stroke(arm);
  paint.beginPath();
  paint.arc(51, 464.5, 4.6, 0, Math.PI * 2);
  paint.strokeStyle = "#dcb3a9";
  paint.lineWidth = 1.3;
  paint.stroke();
  label("ARM", 68, 465, 12, "#dcb3a9");

  paintButton(842, 451, 31, 30, "", 11, true);
  paint.save();
  paint.strokeStyle = "#aeb9b4";
  paint.lineWidth = 2.8;
  paint.lineCap = "round";
  for (const [x, height] of [[850, 9], [857, 20], [864, 13]]) {
    line(x, 466 - height / 2, x, 466 + height / 2, "#aeb9b4", 2.8);
  }
  paint.restore();
  paintButton(880, 451, 31, 30, "", 11, true);
  paint.beginPath();
  paint.moveTo(892, 458); paint.lineTo(892, 474); paint.lineTo(904, 466); paint.closePath();
  paint.fillStyle = "#d8ded9"; paint.fill();
  paintButton(918, 451, 31, 30, "↻", 20, true);
  paintButton(956, 451, 48, 30, "SYNC", 10, true);
  line(1012, 453, 1012, 479, "#505955");
  paintButton(1020, 451, 50, 30, "SNAP", 10, true);
  paintButton(1077, 451, 42, 30, "", 11, true);
  label("1/4", 1083, 466, 10.5, "#a2aba5");
  line(1106, 464, 1110, 468, "#8b9490", 1.2);
  line(1110, 468, 1114, 464, "#8b9490", 1.2);
}

Frame.register({
  id: "sift",
  name: "Sift example",
  width: 1140,
  height: 500,
  paint: paintSift
});
})();
