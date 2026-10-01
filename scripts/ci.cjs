// Reproduce the validation pipeline locally; stop at the first failed stage.
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const output = path.resolve(root, process.env.FRAME_OUTPUT_DIR || 'artifacts/local-ci');
const env = {...process.env, FRAME_OUTPUT_DIR: output};
const stages = [];
const report = {startedAt: new Date().toISOString(), node: process.version, stages};
fs.mkdirSync(output, {recursive: true});

function run(name, command, args) {
  process.stdout.write(`\nLocal CI: ${name}\n`);
  const result = spawnSync(command, args, {cwd: root, env, stdio: 'inherit'});
  const code = result.status ?? 1;
  stages.push({name, status: code === 0 ? 'passed' : 'failed', exitCode: code});
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  if (result.signal) process.stderr.write(`Terminated by ${result.signal}\n`);
  if (code !== 0) finish(code);
}

function finish(code) {
  report.finishedAt = new Date().toISOString();
  report.passed = code === 0;
  fs.writeFileSync(path.join(output, 'ci-report.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(`\nLocal CI ${report.passed ? 'passed' : 'failed'}. Report: ${path.join(output, 'ci-report.json')}\n`);
  process.exit(code);
}

if (Number(process.versions.node.split('.')[0]) < 20) {
  process.stderr.write('Local CI requires Node.js 20 or newer.\n');
  finish(1);
}

const head = spawnSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'});
report.commit = head.status === 0 ? head.stdout.trim() : null;
const status = spawnSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'});
report.dirty = status.status === 0 ? Boolean(status.stdout.trim()) : null;

if (process.env.npm_execpath) {
  run('Install locked dependencies', process.execPath, [process.env.npm_execpath, 'ci']);
} else {
  run('Install locked dependencies', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci']);
}
if (!process.env.FRAME_BROWSER_PATH) {
  run('Install Chromium', process.execPath, [path.join(root, 'node_modules/playwright/cli.js'), 'install', 'chromium']);
}
const tests = fs.readdirSync(path.join(root, 'tests')).filter(name => name.endsWith('.test.cjs')).sort();
run('Model and browser tests', process.execPath, ['--test', ...tests.map(name => path.join(root, 'tests', name))]);
run('End-to-end review workflow', process.execPath, [path.join(root, 'examples/review-workflow.cjs')]);
finish(0);
