import {
  isEventSoftDeleted,
  restoreFields,
  softDeleteFields,
} from '../lib/events/soft-delete.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(!isEventSoftDeleted({}), 'missing deleted_at is active');
assert(!isEventSoftDeleted({ deleted_at: null }), 'null deleted_at is active');
assert(isEventSoftDeleted({ deleted_at: '2026-11-12T10:00:00.000Z' }), 'timestamp is soft-deleted');

const now = new Date('2026-11-12T10:00:00.000Z');
const del = softDeleteFields(now);
assert(del.deleted_at === '2026-11-12T10:00:00.000Z', 'soft delete sets deleted_at');
assert(del.is_primary === false, 'soft delete clears primary');
assert(del.updated_at === '2026-11-12T10:00:00.000Z', 'soft delete bumps updated_at');

const rest = restoreFields(now);
assert(rest.deleted_at === null, 'restore clears deleted_at');
assert(rest.updated_at === '2026-11-12T10:00:00.000Z', 'restore bumps updated_at');
assert(!('is_primary' in rest), 'restore does not touch is_primary');

console.log('PASS event soft delete');
