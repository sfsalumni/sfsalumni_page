import assert from 'node:assert/strict';
import { memoryObjectPath } from '../lib/memories/paths.ts';
import { partitionPublishedMemories } from '../lib/memories/partition.ts';
import { assertMemoryUpload } from '../lib/memories/validate.ts';

assert.equal(memoryObjectPath(1999, 'abc', 'JPG'), 'batch/1999/abc.jpg');
assert.equal(memoryObjectPath(null, 'abc', 'png'), 'general/abc.png');

const rows = [
  { id: '1', batch_year: 1999 },
  { id: '2', batch_year: 2001 },
  { id: '3', batch_year: null },
  { id: '4', batch_year: 1999 },
];
const p = partitionPublishedMemories(rows, 1999);
assert.equal(p.ownBatch.map((r) => r.id).join(), '1,4');
assert.equal(p.allSfs.map((r) => r.id).join(), '2,3');
const none = partitionPublishedMemories(rows, null);
assert.equal(none.ownBatch.length, 0);
assert.equal(none.allSfs.length, 4);

const tiny = { name: 'a.jpg', type: 'image/jpeg', size: 100 };
assert.throws(() => assertMemoryUpload({ title: 'x', consent: false, batchYearRaw: null, file: tiny }), /consent/i);
assert.throws(
  () => assertMemoryUpload({ title: 'x', consent: true, batchYearRaw: null, file: { ...tiny, size: 4_000_001 } }),
  /size|large|4/i
);
assert.throws(
  () => assertMemoryUpload({ title: 'x'.repeat(121), consent: true, batchYearRaw: null, file: tiny }),
  /title/i
);
assert.throws(
  () => assertMemoryUpload({ title: 'x', consent: true, batchYearRaw: null, file: { ...tiny, type: 'image/gif' } }),
  /type|format|mime/i
);
const ok = assertMemoryUpload({
  title: ' Reunion day ',
  description: '  fun  ',
  consent: true,
  batchYearRaw: '1999',
  file: tiny,
});
assert.equal(ok.title, 'Reunion day');
assert.equal(ok.description, 'fun');
assert.equal(ok.batchYear, 1999);
assert.equal(ok.ext, 'jpg');

const general = assertMemoryUpload({
  title: 'Campus',
  consent: true,
  batchYearRaw: 'general',
  file: tiny,
});
assert.equal(general.batchYear, null);

console.log('PASS memories partition/path/validate self-check');
