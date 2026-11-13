/**
 * Self-check: donation cause delete error messaging (no DB).
 * Run: node --experimental-strip-types scripts/check-donation-cause-delete.mjs
 */
import { donationCauseDeleteMessage } from '../lib/donations/cause-delete.ts';

const blocked = donationCauseDeleteMessage({ code: '23503', message: 'fk' });
if (!/Active off|history/i.test(blocked)) {
  throw new Error(`expected history message, got: ${blocked}`);
}

const other = donationCauseDeleteMessage({ code: '42P01', message: 'missing' });
if (other !== 'Could not delete donation type') {
  throw new Error(`expected generic message, got: ${other}`);
}

if (donationCauseDeleteMessage(null) !== 'Could not delete donation type') {
  throw new Error('expected null fallback');
}

console.log('ok: donation cause delete');
