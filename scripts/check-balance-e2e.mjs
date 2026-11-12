/**
 * E2E against live DB: create throwaway account → register → mark paid →
 * grow party → expect partial + due → top-up settle → cleanup.
 */
import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import {
  amountDuePaise,
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
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const tag = randomBytes(4).toString('hex');
const email = `balance-e2e-${tag}@example.com`;
const phone = `+9199${String(Date.now()).slice(-8)}`;

const { data: event, error: evErr } = await admin
  .from('event_catalog')
  .select('*')
  .eq('published', true)
  .order('is_primary', { ascending: false })
  .limit(1)
  .maybeSingle();
assert(!evErr && event, 'published event required');
const pricing = eventToPricing(event);

const { data: account, error: accErr } = await admin
  .from('alumni_accounts')
  .insert({
    email,
    full_name: `Balance E2E ${tag}`,
    phone_number: phone,
    role: 'alumni',
    member_status: 'verified',
    jubilee_reg_status: 'none',
    password_hash: createHash('sha256').update(`e2e-${tag}`).digest('hex'),
  })
  .select('id')
  .single();

if (accErr || !account) {
  console.error('account insert failed', accErr);
  process.exit(1);
}

const accountId = account.id;
let regId = null;

try {
  const input1 = {
    numberOfGuests: 1,
    lunch: true,
    dinner: false,
    parkingNeeded: 'none',
  };
  const total1 = calculateEventRegistrationCost(pricing, input1);

  const { data: reg, error: regErr } = await admin
    .from('event_registrations')
    .insert({
      event_id: event.id,
      account_id: accountId,
      phone_number: phone,
      number_of_guests: 1,
      lunch: true,
      dinner: false,
      parking_needed: 'none',
      attending: true,
      total_cost_paise: total1,
      amount_paid_paise: 0,
      payment_status: 'pending',
    })
    .select('id')
    .single();
  assert(!regErr && reg, `reg insert: ${regErr?.message}`);
  regId = reg.id;

  // Mark paid (full settle)
  const { error: payErr } = await admin
    .from('event_registrations')
    .update({
      amount_paid_paise: total1,
      payment_status: 'paid',
    })
    .eq('id', regId);
  assert(!payErr, payErr?.message);

  // Grow party to 3 guests
  const input2 = { ...input1, numberOfGuests: 3 };
  const total2 = calculateEventRegistrationCost(pricing, input2);
  const paid = total1;
  const due = amountDuePaise(total2, paid);
  const status = statusFromAmounts(total2, paid);

  const { error: updErr } = await admin
    .from('event_registrations')
    .update({
      number_of_guests: 3,
      total_cost_paise: total2,
      amount_paid_paise: paid,
      payment_status: status,
    })
    .eq('id', regId);
  assert(!updErr, updErr?.message);

  const { data: after } = await admin
    .from('event_registrations')
    .select('number_of_guests,total_cost_paise,amount_paid_paise,payment_status')
    .eq('id', regId)
    .single();

  assert(after.payment_status === 'partial', `expected partial got ${after.payment_status}`);
  assert(after.amount_paid_paise === paid, 'paid preserved');
  assert(after.total_cost_paise === total2, 'total updated');
  assert(amountDuePaise(after.total_cost_paise, after.amount_paid_paise) === due, 'due matches');

  // Settle remaining
  const { error: settleErr } = await admin
    .from('event_registrations')
    .update({
      amount_paid_paise: total2,
      payment_status: 'paid',
    })
    .eq('id', regId);
  assert(!settleErr, settleErr?.message);

  const { data: final } = await admin
    .from('event_registrations')
    .select('payment_status,amount_paid_paise,total_cost_paise')
    .eq('id', regId)
    .single();
  assert(final.payment_status === 'paid', 'final paid');
  assert(final.amount_paid_paise === total2, 'final paid amount');

  console.log(
    JSON.stringify(
      {
        ok: true,
        total1,
        total2,
        difference: due,
        afterGrow: after,
        final,
      },
      null,
      2
    )
  );
  console.log('PASS balance e2e');
} finally {
  if (regId) await admin.from('event_registrations').delete().eq('id', regId);
  await admin.from('alumni_accounts').delete().eq('id', accountId);
}
