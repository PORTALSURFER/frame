// A browser's disk binding never changes underneath an in-flight save.
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {createDiskStore} = require('./disk-store.cjs');

async function createWorkspaces(base, dataDirectory) {
  const stores = new Map();
  async function register(directory, create = false) {
    if (typeof directory !== 'string' || !path.isAbsolute(directory)) throw new Error('Expected an absolute workspace folder.');
    if (create) await fs.mkdir(directory, {recursive:true, mode:0o700});
    const real = await fs.realpath(directory);
    if (!(await fs.stat(real)).isDirectory() || real === base || real.startsWith(base + path.sep)) {
      throw new Error('Frame data must be a folder outside the served folder.');
    }
    const id = createHash('sha256').update(real).digest('hex');
    if (!stores.has(id)) stores.set(id, {id, dataDirectory:real, handle:createDiskStore(real)});
    return stores.get(id);
  }
  let active = await register(dataDirectory, true);
  const initial = active;
  const descriptor = () => ({version:1, id:active.id, dataDirectory:active.dataDirectory});
  return {
    descriptor,
    async handle(req, res, pathname) {
      if (pathname !== '/__frame/workspace') {
        const store = stores.get(req.headers['x-frame-workspace'] || initial.id);
        if (!store) { res.writeHead(409).end(JSON.stringify({error:'Workspace unavailable. Reload Frame.'})); return; }
        await store.handle(req, res, pathname);
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      const origin = 'http://' + req.headers.host;
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '') ||
          (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site' ||
          (req.method === 'POST' && req.headers.origin !== origin)) {
        res.writeHead(403).end(); return;
      }
      try {
        if (req.method === 'POST') {
          if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new Error('Expected JSON.');
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 8192) throw new Error('Workspace request is too large.');
          }
          active = await register(JSON.parse(body).dataDirectory);
        } else if (req.method !== 'GET') { res.writeHead(405, {Allow:'GET, POST'}).end(); return; }
        res.writeHead(200).end(JSON.stringify(descriptor()));
      } catch (error) { res.writeHead(400).end(JSON.stringify({error:error.message})); }
    }
  };
}
module.exports = {createWorkspaces};
