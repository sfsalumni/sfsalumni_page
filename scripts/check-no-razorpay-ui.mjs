/**
 * Guards: user-facing payment UI must not offer Razorpay / portal checkout.
 * Run: node scripts/check-no-razorpay-ui.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const donation = read('components/registration_page/registration-donation.tsx');
assert(!donation.includes('Pay through this portal'), 'registration donation still offers portal pay');
assert(!donation.includes("'portal'"), 'registration donation still has portal payment route');

const form = read('components/registration_page/registration-form.tsx');
assert(!form.includes('onPayNow'), 'registration form still wires Razorpay pay button');
assert(!form.includes("paymentRoute === 'portal'"), 'registration form still shows portal Pay');

const regPage = read('app/registration/page.tsx');
assert(!regPage.includes('openRazorpayCheckout'), 'registration page still imports Razorpay checkout');
assert(!regPage.includes('payDue'), 'registration page still has Razorpay payDue');

const success = read('components/registration_page/registration-success.tsx');
assert(!success.includes('canPayMore'), 'success screen still offers Pay');
assert(!success.includes('`Pay ${'), 'success screen still has Pay button');

const donate = read('app/member/donate/page.tsx');
assert(!donate.includes('Pay with Razorpay'), 'donate page still has Razorpay button');
assert(!donate.includes('openRazorpayCheckout'), 'donate page still opens Razorpay');
assert(!/\bRazorpay\b/.test(donate), 'donate page still mentions Razorpay');

const adminDonate = read('app/admin/donations/page.tsx');
assert(!/\bRazorpay\b/.test(adminDonate), 'admin donations page still mentions Razorpay');

console.log('ok: no razorpay ui');
