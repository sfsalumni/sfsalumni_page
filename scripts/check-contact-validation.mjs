import { isPublicEmail, normalizeEmail } from '../lib/email.ts';
import {
  toE164,
  normalizePhoneNumber,
  splitE164,
  phoneValidationError,
  phoneInputHint,
} from '../lib/phone.ts';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

assert(normalizeEmail('  Foo.Bar@Gmail.COM ') === 'foo.bar@gmail.com', 'normalizeEmail');
assert(isPublicEmail('alumni@gmail.com') === true, 'gmail allowed');
assert(isPublicEmail('alumni@yahoo.co.in') === true, 'yahoo.co.in allowed');
assert(isPublicEmail('alumni@outlook.com') === true, 'outlook allowed');
assert(isPublicEmail('alumni@company.com') === false, 'company rejected');
assert(isPublicEmail('not-an-email') === false, 'malformed rejected');
assert(isPublicEmail('') === false, 'empty email rejected');

assert(toE164('+91', '9876543210') === '+919876543210', 'india isd+national');
assert(toE164('+1', '2025551234') === '+12025551234', 'us isd+national');
assert(toE164('91', '9876543210') === '+919876543210', 'isd without plus');
assert(toE164('+91', '123') === null, 'too short national');
assert(toE164('', '9876543210') === null, 'missing isd');
assert(toE164('+91', '') === null, 'missing national');
assert(toE164('+91', '0876543210') === null, 'india landline-ish rejected');
assert(toE164('+91', '987654321') === null, 'india 9 digits rejected');
assert(toE164('+971', '501234567') === '+971501234567', 'uae mobile');
assert(toE164('+971', '401234567') === null, 'uae non-mobile rejected');
assert(phoneValidationError('+91', '9876543210') === null, 'india ok message');
assert(typeof phoneValidationError('+91', '123') === 'string', 'india error message');
assert(phoneInputHint('+91').includes('10-digit'), 'india hint');

assert(normalizePhoneNumber('+44 7700 900123') === '+447700900123', 'e164 single field');
assert(normalizePhoneNumber('not-a-phone') === null, 'junk phone');
assert(normalizePhoneNumber('+919876543210') === '+919876543210', 'already e164');

const splitIn = splitE164('+919876543210');
assert(splitIn.isd === '+91' && splitIn.national === '9876543210', 'split india');
const splitAe = splitE164('+971501234567');
assert(splitAe.isd === '+971' && splitAe.national === '501234567', 'split uae longest match');

console.log('PASS contact validation self-check');
