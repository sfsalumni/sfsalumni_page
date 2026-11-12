/**
 * Self-check for reset token helpers (no DB).
 * Run: node scripts/check-reset-token.mjs
 */
import { createHash, randomBytes } from 'crypto';

function createResetTokenPlain() {
  return randomBytes(32).toString('base64url');
}
function hashResetToken(plain) {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

const a = createResetTokenPlain();
const b = createResetTokenPlain();
if (a === b) throw new Error('tokens should differ');
if (hashResetToken(a) === a) throw new Error('hash should differ from plain');
if (hashResetToken(a) !== hashResetToken(a)) throw new Error('hash must be stable');
if (hashResetToken(a) === hashResetToken(b)) throw new Error('different plains must hash differently');
if (!/^[a-f0-9]{64}$/.test(hashResetToken(a))) throw new Error('expected sha256 hex');
console.log('ok: reset token helpers');
