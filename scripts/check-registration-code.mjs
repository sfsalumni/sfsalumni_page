import QRCode from 'qrcode';
import {
  clearRegistrationCode,
  ensureRegistrationCode,
  isEligibleForRegistrationCode,
  normalizeRegistrationCode,
  registrationCodeFrom,
  shouldIssueRegistrationCode,
} from '../lib/events/registration-code.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
assert(registrationCodeFrom([0, 1, 2, 3, 4]) === 'SFS-ABCDE', 'first five alphabet chars');
assert(registrationCodeFrom([31, 31, 31, 31, 31]) === 'SFS-99999', 'alphabet wraps at the last glyph');
assert(!/[01OI]/.test(registrationCodeFrom([0, 8, 14, 20, 30])), 'code skips easy-to-mix glyphs');
assert(alphabet.length === 32, 'alphabet is 32 glyphs');

assert(normalizeRegistrationCode(' sfs-4k7m2 ') === 'SFS-4K7M2', 'normalizes case and spaces');
assert(normalizeRegistrationCode('4k7m2') === 'SFS-4K7M2', 'adds the SFS prefix');
assert(normalizeRegistrationCode('') === '', 'blank stays blank');

assert(shouldIssueRegistrationCode('paid', null) === true, 'full payment with no code gets one');
assert(shouldIssueRegistrationCode('paid', 'SFS-ABCDE') === false, 'existing code is kept');
assert(shouldIssueRegistrationCode('partial', null) === false, 'a balance does not get a code');
assert(shouldIssueRegistrationCode('pending', '') === false, 'unpaid does not get a code');

assert(
  isEligibleForRegistrationCode({ paymentStatus: 'paid', donationDuePaise: 0 }) === true,
  'fully settled is eligible'
);
assert(
  isEligibleForRegistrationCode({ paymentStatus: 'paid', donationDuePaise: 100 }) === false,
  'unpaid donation blocks eligibility'
);
assert(
  isEligibleForRegistrationCode({ paymentStatus: 'pending', donationDuePaise: 0 }) === false,
  'unpaid fee is not eligible'
);
assert(
  isEligibleForRegistrationCode({ paymentStatus: 'partial', donationDuePaise: 0 }) === false,
  'partial fee is not eligible'
);

function memoryAdmin(start) {
  const state = { code: start, missing: false, writes: 0, hasNext: false, next: null };
  const api = {
    from() {
      return api;
    },
    select() {
      return api;
    },
    update(patch) {
      state.writes += 1;
      state.next = patch.registration_code;
      state.hasNext = true;
      return api;
    },
    eq() {
      return api;
    },
    is() {
      return api;
    },
    async maybeSingle() {
      if (state.missing) {
        return { data: null, error: { code: '42703', message: 'column registration_code does not exist' } };
      }
      if (state.hasNext) {
        state.code = state.next;
        state.hasNext = false;
        state.next = null;
      }
      return { data: { registration_code: state.code }, error: null };
    },
  };
  return { api, state };
}

const keep = memoryAdmin('SFS-KEEP1');
assert(
  (await ensureRegistrationCode(keep.api, 'id', 'paid', () => 'SFS-NEW11')) === 'SFS-KEEP1',
  'paid row keeps its code'
);
assert(keep.state.writes === 0, 'kept code is not rewritten');

const issue = memoryAdmin(null);
assert(
  (await ensureRegistrationCode(issue.api, 'id', 'paid', () => 'SFS-NEW11')) === 'SFS-NEW11',
  'paid row receives a code'
);
assert(issue.state.writes === 1, 'code is written once');

const partial = memoryAdmin(null);
assert((await ensureRegistrationCode(partial.api, 'id', 'partial', () => 'SFS-NEW11')) === null, 'partial writes nothing');
assert(partial.state.writes === 0, 'partial does not update');

const missing = memoryAdmin(null);
missing.state.missing = true;
assert((await ensureRegistrationCode(missing.api, 'id', 'paid', () => 'SFS-NEW11')) === null, 'missing column does not throw');

const clear = memoryAdmin('SFS-KEEP1');
assert((await clearRegistrationCode(clear.api, 'id')) === true, 'clear removes code');
assert(clear.state.code === null, 'code is null after clear');
assert(clear.state.writes === 1, 'clear writes once');

const qr = await QRCode.toDataURL('SFS-ABCDE', { margin: 1, width: 220, errorCorrectionLevel: 'M' });
assert(qr.startsWith('data:image/png;base64,'), 'qr code is a png of the registration id');

console.log('check-registration-code: PASS');
