import crypto from 'crypto';

function verifyCheckout(orderId, paymentId, signature, secret) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || '')));
  } catch {
    return false;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const secret = 'test_secret';
const orderId = 'order_abc';
const paymentId = 'pay_xyz';
const good = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

assert(verifyCheckout(orderId, paymentId, good, secret) === true, 'good signature');
assert(verifyCheckout(orderId, paymentId, 'deadbeef', secret) === false, 'bad signature');
assert(verifyCheckout(orderId, 'pay_other', good, secret) === false, 'tampered payment');

console.log('PASS razorpay signature');
