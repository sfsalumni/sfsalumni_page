/**
 * Self-check for admin bulk approve / verify payload parsers.
 * Run: node --experimental-strip-types scripts/check-admin-bulk-actions.mjs
 */
import {
  MAX_BULK_IDS,
  parseBulkIds,
  parseBulkProofBody,
  parseBulkRegistrationBody,
} from '../lib/admin/bulk-actions.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const uuid2 = '11111111-2222-3333-4444-555555555555';

assert(parseBulkIds([]).ok === false, 'empty ids');
assert(parseBulkIds('x').ok === false, 'non-array');
assert(parseBulkIds(['not-a-uuid']).ok === false, 'bad uuid');
assert(parseBulkIds([uuid, uuid]).ok === true, 'dedupe ok');
assert(parseBulkIds([uuid, uuid]).ids.length === 1, 'dedupe length');

const tooMany = Array.from({ length: MAX_BULK_IDS + 1 }, (_, i) => {
  const n = String(i).padStart(12, '0');
  return `aaaaaaaa-bbbb-cccc-dddd-${n}`;
});
assert(parseBulkIds(tooMany).ok === false, 'cap');

const proofBad = parseBulkProofBody({ ids: [uuid], status: 'pending' });
assert(proofBad.ok === false, 'proof status');

const proofOk = parseBulkProofBody({ ids: [uuid, uuid2], status: 'approved' });
assert(proofOk.ok === true && proofOk.status === 'approved', 'proof approve');
assert(proofOk.ids.length === 2, 'proof ids');

const regBad = parseBulkRegistrationBody({ ids: [uuid], action: 'delete' });
assert(regBad.ok === false, 'reg action');

const regOk = parseBulkRegistrationBody({ ids: [uuid], action: 'verify' });
assert(regOk.ok === true && regOk.action === 'verify', 'reg verify');

console.log('ok: admin bulk actions');
