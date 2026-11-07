const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash, randomUUID} = require('node:crypto');
const FrameDocument = require('../design-document.js');
const FrameFeedback = require('../feedback.js');
const FrameConceptModel = require('../concept-model.js');

const validId = /^[a-z0-9][a-z0-9_-]{0,127}$/i;
const validHash = /^[a-f0-9]{64}$/;
const limits = {projects: 32 << 20, revisions: 32 << 20, feedback: 64 << 20, sources: 16 << 10, concepts: 1 << 20};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const failure = (status, message) => Object.assign(new Error(message), {status});
const assert = (condition, message) => { if (!condition) throw failure(400, message); };

async function readFile(file) {
  try { return await fs.readFile(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function readBody(req, limit) {
  if (Number(req.headers['content-length']) > limit) throw failure(413, 'Disk record exceeds its size limit.');
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) throw failure(413, 'Disk record exceeds its size limit.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}
function parse(bytes) {
  try { return JSON.parse(bytes); }
  catch { throw failure(400, 'Invalid JSON.'); }
}
async function publish(file, bytes) {
  const directory = path.dirname(file);
  await fs.mkdir(directory, {recursive: true, mode: 0o700});
  const temporary = path.join(directory, '.' + randomUUID());
  try {
    const handle = await fs.open(temporary, 'wx', 0o600);
    try { await handle.writeFile(bytes); await handle.sync(); }
    finally { await handle.close(); }
    await fs.link(temporary, file);
    const folder = await fs.open(directory, 'r');
    try { await folder.sync(); }
    finally { await folder.close(); }
  } finally { await fs.rm(temporary, {force: true}); }
}

function createDiskStore(dataDirectory) {
  const directory = path.resolve(dataDirectory);
  const revisions = path.join(directory, 'revisions');
  const revisionPath = digest => path.join(revisions, digest + '.json');
  const recordPath = (kind, id) => path.join(directory, kind, id);
  const stat = async dir => {
    try { return await fs.readdir(dir); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  };
  async function generations(dir) {
    return (await stat(dir)).filter(name => /^[1-9]\d*\.json$/.test(name))
      .map(name => Number(name.slice(0, -5))).filter(Number.isSafeInteger).sort((a, b) => b - a);
  }
  async function latest(kind, id) {
    const dir = recordPath(kind, id);
    for (let attempt = 0; attempt < 3; attempt++) {
      const [generation] = await generations(dir);
      if (!generation) return null;
      const bytes = await readFile(path.join(dir, generation + '.json'));
      if (!bytes) continue; // A newer generation may have pruned this one.
      const record = JSON.parse(bytes);
      if (record.id !== id || record.generation !== generation || record.version !== 1 || !record.data) {
        throw failure(500, 'Saved disk data is unreadable and has been preserved.');
      }
      return record;
    }
    throw failure(409, 'Disk data changed while reading. Retry the read.');
  }
  async function listProjects() {
    const ids = (await stat(path.join(directory, 'projects'))).filter(name => validId.test(name));
    const records = await Promise.all(ids.map(id => latest('projects', id)));
    return records.filter(Boolean).map(({id, generation, updatedAt, data}) =>
      ({id, name: data.name, generation, updatedAt, revisionId: data.archive.currentRevisionId}))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async function validateProject(id, data) {
    assert(data?.format === 'frame-project' && data.version === 1, 'Invalid disk project.');
    const archive = data.archive;
    assert(archive?.version === 1 && archive.designId === id && Array.isArray(archive.revisions) &&
      archive.revisions.some(entry => entry?.revisionId === archive.currentRevisionId), 'Invalid revision manifest.');
    const ids = new Set();
    for (const entry of archive.revisions) {
      assert(entry && validHash.test(entry.document) && typeof entry.revisionId === 'string' &&
        !ids.has(entry.revisionId) && Number.isFinite(Date.parse(entry.capturedAt)), 'Invalid revision manifest entry.');
      ids.add(entry.revisionId);
      const bytes = await readFile(path.join(revisions, entry.document + '.meta'));
      const descriptor = bytes && JSON.parse(bytes);
      assert(descriptor?.id === id && descriptor.revisionId === entry.revisionId,
        'Missing or mismatched revision body.');
    }
    FrameFeedback.validate(data.feedback, {id});
  }
  async function validate(kind, id, data) {
    if (kind === 'projects') await validateProject(id, data);
    else if (kind === 'feedback') FrameFeedback.validate(data, {id});
    else if (kind === 'concepts') FrameConceptModel.validate(data, {id});
    else assert(data?.id === id && data.version === 1 && typeof data.enabled === 'boolean' &&
      typeof data.url === 'string' && data.url.length <= 4096 && typeof data.revisionId === 'string' &&
      validHash.test(data.digest) && Number.isInteger(data.interval) && data.interval >= 250 && data.interval <= 60000,
    'Invalid source settings.');
  }
  async function save(kind, id, expected, data) {
    assert(Number.isSafeInteger(expected) && expected >= 0 && expected < Number.MAX_SAFE_INTEGER, 'Invalid expected generation.');
    const old = await latest(kind, id);
    const conflict = () => failure(409, 'Disk data changed in another session. Read and compare the saved version before retrying.');
    if ((old?.generation || 0) !== expected) throw conflict();
    try { await validate(kind, id, data); }
    catch (error) { if (error.code) throw error; throw failure(error.status || 400, error.message); }
    const record = {version: 1, id, generation: expected + 1, updatedAt: new Date().toISOString(), data};
    const dir = recordPath(kind, id);
    try { await publish(path.join(dir, record.generation + '.json'), JSON.stringify(record)); }
    catch (error) { if (error.code === 'EEXIST') throw conflict(); throw error; }
    // Another server can have advanced far enough to prune the generation
    // this writer raced for. A re-created older file can never be the head.
    const [head] = await generations(dir);
    if (head > record.generation) throw conflict();
    // Keep the last generation available to readers and for local recovery.
    for (const generation of await generations(dir).catch(() => [])) {
      if (generation < expected) await fs.rm(path.join(dir, generation + '.json'), {force: true}).catch(() => {});
    }
    return {id, generation: record.generation, updatedAt: record.updatedAt};
  }
  async function saveRevision(digest, bytes) {
    assert(hash(bytes) === digest, 'Revision digest does not match its body.');
    const doc = parse(bytes);
    try { FrameDocument.validate(doc); }
    catch (error) { throw failure(400, error.message); }
    assert(validId.test(doc.id), 'Invalid project identity.');
    const file = revisionPath(digest);
    const descriptor = JSON.stringify({id: doc.id, revisionId: doc.revisionId});
    for (const [target, content] of [[file, bytes], [path.join(revisions, digest + '.meta'), descriptor]]) {
      try { await publish(target, content); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const saved = await readFile(target);
        if (!saved?.equals(Buffer.from(content))) throw failure(500, 'Existing revision data is unreadable and has been preserved.');
      }
    }
  }
  function respond(res, status, data) {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
    res.writeHead(status, {'Content-Type': 'application/json', 'Content-Length': bytes.length}).end(bytes);
  }
  return async (req, res, pathname) => {
    const origin = 'http://' + req.headers.host;
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '') ||
        (req.headers.origin && req.headers.origin !== origin) ||
        req.headers['sec-fetch-site'] === 'cross-site' ||
        (req.method === 'PUT' && req.headers.origin !== origin)) {
      res.writeHead(403).end(); return;
    }
    res.setHeader('Cache-Control', 'no-store');
    try {
      const [, , kind, id, trailing] = pathname.split('/');
      if (!Object.hasOwn(limits, kind) || trailing !== undefined ||
        (kind === 'revisions' ? !validHash.test(id || '') : id !== undefined && !validId.test(id))) {
        res.writeHead(404).end(); return;
      }
      if (kind === 'projects' && id === undefined && req.method === 'GET') {
        respond(res, 200, await listProjects()); return;
      }
      if (!id) { res.writeHead(404).end(); return; }
      if (kind === 'revisions' && req.method === 'HEAD') {
        res.writeHead(await readFile(path.join(revisions, id + '.meta')) ? 200 : 404).end(); return;
      }
      if (req.method === 'GET') {
        const data = kind === 'revisions' ? await readFile(revisionPath(id)) : await latest(kind, id);
        if (!data) { res.writeHead(404).end(); return; }
        respond(res, 200, data); return;
      }
      if (req.method !== 'PUT') { res.writeHead(405, {Allow: 'GET, HEAD, PUT'}).end(); return; }
      assert(req.headers['content-type']?.split(';')[0] === 'application/json', 'Expected JSON.');
      const bytes = await readBody(req, limits[kind]);
      if (kind === 'revisions') { await saveRevision(id, bytes); res.writeHead(204).end(); return; }
      const {expected, data} = parse(bytes) || {};
      respond(res, 200, await save(kind, id, expected, data));
    } catch (error) {
      if (!res.destroyed) respond(res, error.status || 500, {error: error.status ? error.message : 'Frame could not access its disk storage.'});
    }
  };
}
module.exports = {createDiskStore};
