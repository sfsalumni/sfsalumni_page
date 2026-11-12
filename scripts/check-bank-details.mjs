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
  throw new Error('expected proof required');
} catch (e) {
  if (!(e instanceof Error) || !/UTR|screenshot/i.test(e.message)) throw e;
}

const withUtr = assertOfflineProofFields({ utr: '  ABC123  ', file: null });
if (withUtr.utr !== 'ABC123' || withUtr.file) throw new Error('utr only');

const withFile = assertOfflineProofFields({
  utr: '',
  file: { type: 'image/png', size: 100, name: 'x.png' },
});
if (!withFile.file || withFile.file.ext !== 'png') throw new Error('file only');

try {
  assertOfflineProofFields({
    utr: '',
    file: { type: 'image/gif', size: 10, name: 'x.gif' },
  });
  throw new Error('expected mime fail');
} catch (e) {
  if (!(e instanceof Error) || !/JPEG|PNG|WebP/i.test(e.message)) throw e;
}

try {
  assertOfflineProofFields({
    utr: '',
    file: { type: 'image/jpeg', size: 4_000_001, name: 'x.jpg' },
  });
  throw new Error('expected size fail');
} catch (e) {
  if (!(e instanceof Error) || !/4 MB/i.test(e.message)) throw e;
}

console.log('ok: bank details');
