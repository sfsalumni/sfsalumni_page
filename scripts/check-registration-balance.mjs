import {
  amountDuePaise,
  applyPaymentAmounts,
  statusFromAmounts,
} from '../lib/events/balance.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(amountDuePaise(80000, 50000) === 30000, 'due 30000');
assert(amountDuePaise(40000, 50000) === 0, 'overpay due 0');
assert(amountDuePaise(0, 0) === 0, 'zero');

assert(statusFromAmounts(80000, 0) === 'pending', 'pending');
assert(statusFromAmounts(80000, 50000) === 'partial', 'partial');
assert(statusFromAmounts(80000, 80000) === 'paid', 'paid exact');
assert(statusFromAmounts(40000, 50000) === 'paid', 'paid over');
assert(statusFromAmounts(0, 0) === 'paid', 'free paid');

const topUp = applyPaymentAmounts(80000, 50000, 30000);
assert(topUp.amount_paid_paise === 80000, 'top-up paid');
assert(topUp.payment_status === 'paid', 'top-up status');
assert(topUp.amount_due_paise === 0, 'top-up due');

const partialPay = applyPaymentAmounts(80000, 0, 50000);
assert(partialPay.amount_paid_paise === 50000, 'partial paid');
assert(partialPay.payment_status === 'partial', 'partial status');
assert(partialPay.amount_due_paise === 30000, 'partial due');

const fullSettle = applyPaymentAmounts(80000, 20000, 999999);
assert(fullSettle.amount_paid_paise === 80000, 'settle caps at total');
assert(fullSettle.payment_status === 'paid', 'settle paid');

console.log('PASS registration balance');
