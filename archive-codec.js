// Lossless, bounded-dictionary LZW storage for large revision archives.
// The archive remains ordinary JSON when exported; only browser storage is encoded.
(function(root) {
  const prefix = 'frame-lzw-v1:', reset = 256, first = 257, limit = 32700;
  const maxBytes = 256 * 1024 * 1024;
  function compress(value) {
    const bytes = new TextEncoder().encode(value), dictionary = new Map(), output = [];
    let next = first, current = null;
    for (const byte of bytes) {
      if (current === null) { current = byte; continue; }
      const key = current * 256 + byte, found = dictionary.get(key);
      if (found !== undefined) { current = found; continue; }
      output.push(current);
      if (next < limit) dictionary.set(key, next++);
      else { output.push(reset); dictionary.clear(); next = first; }
      current = byte;
    }
    if (current !== null) output.push(current);
    let encoded = prefix;
    for (let i = 0; i < output.length; i += 8192)
      encoded += String.fromCharCode(...output.slice(i, i + 8192).map(code => code + 32));
    return encoded;
  }
  function decompress(value) {
    if (!value.startsWith(prefix)) return value;
    const dictionary = [], output = [], decoder = new TextDecoder('utf-8', {fatal: true});
    const buffer = new Uint8Array(65536);
    let used = 0, total = 0;
    let next = first, previous = null;
    for (let i = prefix.length; i < value.length; i++) {
      const code = value.charCodeAt(i) - 32;
      if (code === reset) { dictionary.length = 0; next = first; previous = null; continue; }
      let entry;
      if (code >= 0 && code < 256) entry = [code];
      else if (code >= first && code < next && dictionary[code]) entry = dictionary[code];
      else if (code === next && previous && next < limit) entry = [...previous, previous[0]];
      else throw new Error('Invalid compressed project archive');
      if (total + entry.length > maxBytes) throw new Error('Compressed project archive exceeds the size limit');
      total += entry.length;
      for (const byte of entry) {
        buffer[used++] = byte;
        if (used === buffer.length) { output.push(decoder.decode(buffer, {stream: true})); used = 0; }
      }
      if (previous && next < limit) dictionary[next++] = [...previous, entry[0]];
      previous = entry;
    }
    output.push(decoder.decode(buffer.subarray(0, used), {stream: true}), decoder.decode());
    return output.join('');
  }
  function pack(archive) {
    const elements = [], states = [], elementMap = new Map(), stateMap = new Map();
    const intern = (value, pool, map) => {
      const key = JSON.stringify(value);
      if (!map.has(key)) { map.set(key, pool.length); pool.push(value); }
      return map.get(key);
    };
    const revisions = archive.revisions.map(revision => {
      const doc = {...revision.document};
      doc.elements = doc.elements.map(element => intern(element, elements, elementMap));
      if (doc.states !== undefined) doc.states = Object.fromEntries(Object.entries(doc.states).map(([name, state]) => [name, intern(state, states, stateMap)]));
      return {...revision, document: doc};
    });
    return {format: 'frame-archive-dedup-v1', archive: {...archive, revisions}, elements, states};
  }
  function unpack(value) {
    if (!value || value.format !== 'frame-archive-dedup-v1') return value;
    if (!value.archive || !Array.isArray(value.archive.revisions) || !Array.isArray(value.elements) || !Array.isArray(value.states)) throw new Error('Invalid compact project archive');
    const resolve = (pool, index) => {
      if (!Number.isSafeInteger(index) || index < 0 || index >= pool.length) throw new Error('Invalid compact project reference');
      return pool[index];
    };
    const revisions = value.archive.revisions.map(revision => {
      const doc = {...revision.document};
      if (!Array.isArray(doc.elements)) throw new Error('Invalid compact project elements');
      doc.elements = doc.elements.map(index => resolve(value.elements, index));
      if (doc.states !== undefined) {
        if (!doc.states || typeof doc.states !== 'object' || Array.isArray(doc.states)) throw new Error('Invalid compact project states');
        doc.states = Object.fromEntries(Object.entries(doc.states).map(([name, index]) => [name, resolve(value.states, index)]));
      }
      return {...revision, document: doc};
    });
    return {...value.archive, revisions};
  }
  const api = {compress, decompress, pack, unpack};
  if (typeof module !== 'undefined') module.exports = api; else root.FrameArchiveCodec = api;
})(typeof window === 'undefined' ? globalThis : window);
