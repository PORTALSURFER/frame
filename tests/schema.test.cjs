const {test} = require('node:test');
const assert = require('node:assert/strict');
const codec = require('../feedback.js');
const design = {id: 'demo', width: 800, height: 600, revisionId: 'r1'};
test('legacy migration retains oversized geometry and IDs without inventing dates or revisions', () => {
  const points = Array.from({length: 5001}, (_, i) => [i, -(i + 1)]);
  const migrated = codec.read({version: 2, lines: [points], notes: [{id:'legacy-stroke-demo-1', text:'Retain me', anchor:[-20, 900]}]}, design);
  assert.deepEqual(migrated.lines[0].points, points);
  assert.notEqual(migrated.lines[0].id, migrated.notes[0].id);
  assert.equal(migrated.notes[0].id, 'legacy-stroke-demo-1');
  assert.equal(migrated.notes[0].createdAt, null);
  assert.equal(migrated.notes[0].revisionId, null);
  assert.deepEqual(codec.read(JSON.parse(JSON.stringify(migrated)), design), migrated);
  assert.equal(codec.read([points], design).lines[0].id, codec.read([points], design).lines[0].id);
});
test('new marks carry revision identity and strict document validation rejects malformed data atomically', () => {
  const stroke = {...codec.metadata('stroke', design), points:[[1,2],[3,4]], elementAnchor:{elementId:'button',offset:[1,-1]}};
  const note = {...codec.metadata('note', design), text:'A note', anchor:[4,5]};
  const data = codec.document(design, [stroke], [note]);
  assert.deepEqual(codec.validate(data, design), data);
  assert.equal(stroke.revisionId, 'r1');
  for (const mutate of [
    d=>d.version=99, d=>d.design='other', d=>d.notes[0].id=d.lines[0].id,
    d=>d.lines[0].points[0][0]=null, d=>d.lines[0].elementAnchor.offset=[1],
    d=>d.notes[0].createdAt='yesterday', d=>d.notes[0].updatedAt='2000-01-01T00:00:00.000Z',
    d=>d.notes[0].type='stroke', d=>d.notes[0].text='', d=>d.width=-1
  ]) {
    const invalid = structuredClone(data); mutate(invalid);
    assert.throws(()=>codec.read(invalid, design));
  }
});
