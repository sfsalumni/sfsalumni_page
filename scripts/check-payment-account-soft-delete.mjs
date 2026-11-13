/**
 * Self-check for payment account soft-delete helpers (no DB).
 * Run: node --experimental-strip-types scripts/check-payment-account-soft-delete.mjs
 */
import {
  isPaymentAccountSoftDeleted,
  restorePaymentAccountFields,
  softDeletePaymentAccountFields,
} from '../lib/payments/soft-delete.ts';

if (isPaymentAccountSoftDeleted({})) throw new Error('empty should not be deleted');
if (isPaymentAccountSoftDeleted({ deleted_at: null })) throw new Error('null should not be deleted');
if (!isPaymentAccountSoftDeleted({ deleted_at: '2026-01-01T00:00:00.000Z' })) {
  throw new Error('timestamp should be deleted');
}

const del = softDeletePaymentAccountFields(new Date('2026-11-13T00:00:00.000Z'));
if (del.active !== false) throw new Error('soft delete must clear active');
if (del.deleted_at !== '2026-11-13T00:00:00.000Z') throw new Error('deleted_at');

const rest = restorePaymentAccountFields(new Date('2026-11-13T01:00:00.000Z'));
if (rest.deleted_at !== null) throw new Error('restore clears deleted_at');

console.log('PASS payment account soft delete');
