/**
 * Self-check for member hard-delete guards.
 * Run: node --experimental-strip-types scripts/check-member-purge.mjs
 */
import {
  assertPurgeAllowed,
  emailsMatchConfirm,
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

console.log('ok: member purge');
