/**
 * Smoke: schema columns + party-size balance math against live Supabase.
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import {
  amountDuePaise,
  applyPaymentAmounts,
  statusFromAmounts,
} from '../lib/events/balance.ts';
import { calculateEventRegistrationCost } from '../lib/registration.ts';
import { eventToPricing } from '../lib/events/pricing.ts';

function loadEnvLocal() {
  const path = new URL('../.env.local', import.meta.url).pathname;
  if (!existsSync(path)) throw new Error('Missing .env.local');
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

loadEnvLocal();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(url && key, 'Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: cols, error: colErr } = await admin
  .from('event_registrations')
  .select('id,amount_paid_paise,payment_status,total_cost_paise,razorpay_order_id')
  .limit(1);

if (colErr) {
  console.error('SCHEMA FAIL', colErr.message);
  process.exit(1);
}
console.log('SCHEMA OK amount_paid_paise + razorpay columns selectable');

const { data: event, error: evErr } = await admin
  .from('event_catalog')
  .select(
    'id,lunch_paise,dinner_paise,parking_2w_paise,parking_4w_paise,base_ticket_paise,is_primary,published'
  )
  .eq('published', true)
  .order('is_primary', { ascending: false })
  .limit(1)
  .maybeSingle();

assert(!evErr && event, 'Need a published event');
const pricing = eventToPricing(event);

const baseInput = {
  numberOfGuests: 1,
  lunch: true,
  dinner: false,
  parkingNeeded: 'none',
};
const total1 = calculateEventRegistrationCost(pricing, baseInput);
const total2 = calculateEventRegistrationCost(pricing, {
  ...baseInput,
  numberOfGuests: 3,
});
assert(total2 > total1, 'more guests should cost more when lunch selected');

const afterFirstPay = applyPaymentAmounts(total1, 0, total1);
assert(afterFirstPay.payment_status === 'paid', 'first pay → paid');
assert(afterFirstPay.amount_due_paise === 0, 'first pay due 0');

const afterGrow = statusFromAmounts(total2, afterFirstPay.amount_paid_paise);
const dueGrow = amountDuePaise(total2, afterFirstPay.amount_paid_paise);
assert(afterGrow === 'partial', `grow → partial got ${afterGrow}`);
assert(dueGrow === total2 - total1, `due delta expected ${total2 - total1} got ${dueGrow}`);

const afterTopUp = applyPaymentAmounts(total2, afterFirstPay.amount_paid_paise, dueGrow);
assert(afterTopUp.payment_status === 'paid', 'top-up → paid');
assert(afterTopUp.amount_due_paise === 0, 'top-up due 0');

const shrink = amountDuePaise(total1, afterTopUp.amount_paid_paise);
assert(shrink === 0, 'shrink does not create negative due');
assert(
  statusFromAmounts(total1, afterTopUp.amount_paid_paise) === 'paid',
  'overpay stays paid'
);

console.log(
  JSON.stringify(
    {
      eventId: event.id,
      guest1_total: total1,
      guest3_total: total2,
      difference_due: dueGrow,
      sample_row: cols?.[0] || null,
    },
    null,
    2
  )
);
console.log('PASS balance flow against live catalog');
