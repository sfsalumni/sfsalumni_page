import { jubileeCta, jubileeNavCta, postAuthPath } from '../lib/jubilee-cta.ts';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

assert(jubileeCta(null).show && jubileeCta(null).href === '/registration', 'guest');
assert(!jubileeCta({ role: 'admin' }).show, 'admin hides');
assert(jubileeNavCta({ role: 'alumni', jubilee_reg_status: 'none' }).label === 'Register', 'alumni none');
assert(
  jubileeNavCta({ role: 'alumni', jubilee_reg_status: 'pending_payment' }).label === 'Complete payment',
  'pending'
);
assert(
  jubileeNavCta({
    role: 'alumni',
    jubilee_reg_status: 'pending_payment',
    payment_proof_pending: true,
  }).label === 'Awaiting confirmation',
  'pending with proof submitted'
);
assert(
  jubileeCta({
    role: 'alumni',
    jubilee_reg_status: 'pending_payment',
    payment_proof_pending: true,
  }).label === 'Awaiting confirmation',
  'hero pending with proof'
);
assert(!jubileeNavCta({ role: 'alumni', jubilee_reg_status: 'paid' }).show, 'paid hides registration');
assert(!jubileeCta({ role: 'alumni', jubilee_reg_status: 'paid' }).show, 'paid hides hero');
assert(postAuthPath({ role: 'admin' }) === '/admin', 'admin redirect');
assert(postAuthPath({ role: 'alumni', jubilee_reg_status: 'paid' }) === '/member', 'paid redirect');

console.log('PASS jubilee cta self-check');
