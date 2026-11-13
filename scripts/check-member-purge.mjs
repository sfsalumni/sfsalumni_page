/**
 * Self-check for member hard-delete guards + maintenance bulk payload.
 * Run: node --experimental-strip-types scripts/check-member-purge.mjs
 */
import {
  MAINTENANCE_BULK_CONFIRM,
  assertPurgeAllowed,
  deleteConfirmMatches,
  emailsMatchConfirm,
  parseMaintenanceBulkBody,
} from '../lib/admin/member-purge.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const a = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const b = '11111111-2222-3333-4444-555555555555';

assert(assertPurgeAllowed({ actorId: a, targetId: a, targetRole: 'alumni' }).ok === false, 'self');
assert(
  assertPurgeAllowed({ actorId: a, targetId: b, targetRole: 'admin' }).ok === false,
  'admin target'
);
assert(assertPurgeAllowed({ actorId: a, targetId: b, targetRole: 'alumni' }).ok === true, 'alumni ok');

assert(emailsMatchConfirm('A@B.com', 'a@b.com') === true, 'email case');
assert(emailsMatchConfirm('a@b.com', ' other@b.com ') === false, 'email mismatch');
assert(emailsMatchConfirm('a@b.com', '  a@b.com  ') === true, 'email trim');

assert(deleteConfirmMatches(MAINTENANCE_BULK_CONFIRM) === true, 'confirm word');
assert(deleteConfirmMatches('delete') === false, 'confirm case');

const bulkBadConfirm = parseMaintenanceBulkBody({
  ids: [a],
  scope: 'registrations',
  confirm: 'nope',
});
assert(bulkBadConfirm.ok === false, 'bulk confirm');

const bulkBadScope = parseMaintenanceBulkBody({
  ids: [a],
  scope: 'all',
  confirm: MAINTENANCE_BULK_CONFIRM,
});
assert(bulkBadScope.ok === false, 'bulk scope');

const bulkOk = parseMaintenanceBulkBody({
  ids: [a, b],
  scope: 'membership',
  confirm: MAINTENANCE_BULK_CONFIRM,
});
assert(bulkOk.ok === true && bulkOk.scope === 'membership' && bulkOk.ids.length === 2, 'bulk ok');

console.log('ok: member purge');
