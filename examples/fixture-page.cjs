// Browser tests and the review example explicitly opt into sample designs.
const path = require('node:path');
const fs = require('node:fs/promises');

const designs = [
  'starter.js', 'sift-waveform-data.js', 'sift.js', 'instrument.js',
  'sift-style-studies.js', 'frame-workspace.js', 'gainsnap-sift-hardware.js'
];
async function readFixturePage(file) {
  if (path.basename(file) !== 'index.html') return fs.readFile(file);
  const html = await fs.readFile(file, 'utf8');
  const scripts = designs.map(name => '  <script src="/examples/' + name + '" defer></script>').join('\n');
  return html.replace('  <script src="app.js', scripts + '\n  <script src="app.js');
}
module.exports = {readFixturePage};
