/**
 * Self-check for bank / UPI helpers and offline-proof validation (no DB).
 * Run: node --experimental-strip-types scripts/check-bank-details.mjs
 */
import {
  assertOfflineProofFields,
  buildUpiPayUri,
  formatInr,
  validateBankAccountFields,
} from '../lib/payments/bank-details.ts';
import {
  PENDING_PROOF_LOCK_MESSAGE,
  SCREENSHOT_BANK_REFERENCE,
  bankReferenceFromProof,
  pendingProofDisplay,
  verificationStatusLabel,
} from '../lib/payments/offline-proof.ts';

if (formatInr(50000) !== '₹500') throw new Error(`formatInr 50000 → ${formatInr(50000)}`);
if (formatInr(10150) !== '₹101.5') throw new Error(`formatInr 10150 → ${formatInr(10150)}`);

if (buildUpiPayUri({ upiId: '', amountPaise: 100 }) !== null) throw new Error('empty upi');
if (buildUpiPayUri({ upiId: 'a@ok', amountPaise: 0 }) !== null) throw new Error('zero amount');

const uri = buildUpiPayUri({
  upiId: 'alumni@okaxis',
  amountPaise: 50000,
  payeeName: 'SFS Alumni',
  note: 'Jubilee',
});
if (!uri || !uri.startsWith('upi://pay?')) throw new Error('uri prefix');
const q = new URL(uri).searchParams;
if (q.get('pa') !== 'alumni@okaxis') throw new Error('pa');
if (q.get('pn') !== 'SFS Alumni') throw new Error('pn');
if (q.get('am') !== '500.00') throw new Error(`am ${q.get('am')}`);
if (q.get('cu') !== 'INR') throw new Error('cu');
if (q.get('tn') !== 'Jubilee') throw new Error('tn');

const okAccount = validateBankAccountFields({
  label: 'Jubilee',
  account_name: 'Holder',
  account_number: '123456789012',
  ifsc: 'sbin0001234',
  bank_name: 'SBI',
  upi_id: 'alumni@okaxis',
});
if (okAccount.ifsc !== 'SBIN0001234') throw new Error('ifsc upper');
if (okAccount.account_number !== '123456789012') throw new Error('acct');

try {
  validateBankAccountFields({
    label: 'x',
    account_name: 'y',
    account_number: '12',
    ifsc: 'SBIN0001234',
  });
  throw new Error('expected short account');
} catch (e) {
  if (!(e instanceof Error) || !/account number/i.test(e.message)) throw e;
}

try {
  validateBankAccountFields({
    label: 'x',
    account_name: 'y',
    account_number: '123456',
    ifsc: 'BAD',
  });
  throw new Error('expected ifsc fail');
} catch (e) {
  if (!(e instanceof Error) || !/ifsc/i.test(e.message)) throw e;
}

try {
  validateBankAccountFields({
    label: 'x',
    account_name: 'y',
    account_number: '123456',
    ifsc: 'SBIN0001234',
    upi_id: 'noupper',
  });
  throw new Error('expected upi fail');
} catch (e) {
  if (!(e instanceof Error) || !/upi/i.test(e.message)) throw e;
}

try {
  assertOfflineProofFields({ utr: '', file: null });
  throw new Error('expected utr required');
} catch (e) {
  if (!(e instanceof Error) || e.message !== 'UTR / reference is required') throw e;
}

try {
  assertOfflineProofFields({
    utr: '',
    file: { type: 'image/png', size: 100, name: 'x.png' },
  });
  throw new Error('expected utr required even with screenshot');
} catch (e) {
  if (!(e instanceof Error) || e.message !== 'UTR / reference is required') throw e;
}

const withUtr = assertOfflineProofFields({ utr: '  ABC123  ', file: null });
if (withUtr.utr !== 'ABC123' || withUtr.file) throw new Error('utr only');

const withBoth = assertOfflineProofFields({
  utr: 'REF9',
  file: { type: 'image/png', size: 100, name: 'x.png' },
});
if (withBoth.utr !== 'REF9' || !withBoth.file || withBoth.file.ext !== 'png') {
  throw new Error('utr + file');
}

try {
  assertOfflineProofFields({
    utr: 'REF',
    file: { type: 'image/gif', size: 10, name: 'x.gif' },
  });
  throw new Error('expected mime fail');
} catch (e) {
  if (!(e instanceof Error) || !/JPEG|PNG|WebP/i.test(e.message)) throw e;
}

try {
  assertOfflineProofFields({
    utr: 'REF',
    file: { type: 'image/jpeg', size: 4_000_001, name: 'x.jpg' },
  });
  throw new Error('expected size fail');
} catch (e) {
  if (!(e instanceof Error) || !/4 MB/i.test(e.message)) throw e;
}

if (bankReferenceFromProof({ utr: '  REF1  ', hasScreenshot: false }) !== 'REF1') {
  throw new Error('bank ref from utr');
}
if (bankReferenceFromProof({ utr: '', hasScreenshot: true }) !== SCREENSHOT_BANK_REFERENCE) {
  throw new Error('bank ref from screenshot');
}
try {
  bankReferenceFromProof({ utr: '', hasScreenshot: false });
  throw new Error('expected empty proof bank ref fail');
} catch (e) {
  if (!(e instanceof Error) || !/UTR|screenshot/i.test(e.message)) throw e;
}

if (verificationStatusLabel({ paymentStatus: 'pending', pendingProof: false, bankReference: '' }) !== 'not submitted') {
  throw new Error('status not submitted');
}
if (
  verificationStatusLabel({ paymentStatus: 'pending', pendingProof: true, bankReference: '' }) !==
  'pending verification'
) {
  throw new Error('status pending proof');
}
if (
  verificationStatusLabel({ paymentStatus: 'pending', pendingProof: false, bankReference: 'ABC' }) !==
  'pending verification'
) {
  throw new Error('status bank ref');
}
if (verificationStatusLabel({ paymentStatus: 'paid', pendingProof: true, bankReference: 'x' }) !== 'paid') {
  throw new Error('status paid wins');
}

const shown = pendingProofDisplay({ utr: 'UTR99', screenshot_path: null });
if (shown.utr !== 'UTR99' || !shown.label.includes('UTR99') || !shown.label.includes('pending')) {
  throw new Error('pending display utr');
}
if (!PENDING_PROOF_LOCK_MESSAGE.includes('pending committee review')) {
  throw new Error('lock message');
}

console.log('ok: bank details');
