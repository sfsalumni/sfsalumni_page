/**
 * Self-check: which offline proof + bank ref to show on admin Registrations.
 * Run: node --experimental-strip-types scripts/check-registration-proof-display.mjs
 */
import {
  displayBankReference,
  indexProofsByRegistration,
  pickProofForRegistration,
} from '../lib/admin/registration-proof.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const regA = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const regB = '11111111-2222-3333-4444-555555555555';

assert(displayBankReference({ bankReference: null, proofUtr: null }) === null, 'empty');
assert(displayBankReference({ bankReference: '  REF1  ', proofUtr: null }) === 'REF1', 'bank ref');
assert(
  displayBankReference({ bankReference: null, proofUtr: '  UTR9  ' }) === 'UTR9',
  'proof utr'
);
assert(
  displayBankReference({ bankReference: 'REF1', proofUtr: 'UTR9' }) === 'REF1',
  'prefer bank_reference'
);

const proofs = [
  {
    registration_id: regA,
    utr: 'OLD',
    screenshot_path: null,
    status: 'rejected',
    created_at: '2026-11-01T00:00:00.000Z',
  },
  {
    registration_id: regA,
    utr: 'PENDING',
    screenshot_path: 'a/b.png',
    status: 'pending',
    created_at: '2026-11-10T00:00:00.000Z',
  },
  {
    registration_id: regA,
    utr: 'NEWER_APPROVED',
    screenshot_path: null,
    status: 'approved',
    created_at: '2026-11-12T00:00:00.000Z',
  },
  {
    registration_id: regB,
    utr: 'B-ONLY',
    screenshot_path: 'b/c.jpg',
    status: 'approved',
    created_at: '2026-11-11T00:00:00.000Z',
  },
];

const pickedA = pickProofForRegistration(proofs, regA);
assert(pickedA?.utr === 'PENDING', 'prefer pending over newer approved');
assert(pickedA?.screenshot_path === 'a/b.png', 'pending screenshot');

const pickedB = pickProofForRegistration(proofs, regB);
assert(pickedB?.utr === 'B-ONLY', 'single proof');

assert(pickProofForRegistration(proofs, '00000000-0000-0000-0000-000000000000') === null, 'missing');

const indexed = indexProofsByRegistration(proofs);
assert(indexed.get(regA)?.utr === 'PENDING', 'index A');
assert(indexed.get(regB)?.utr === 'B-ONLY', 'index B');
assert(indexed.size === 2, 'index size');

console.log('ok: registration proof display');
