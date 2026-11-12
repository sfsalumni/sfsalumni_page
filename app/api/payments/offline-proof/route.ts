// Accepts UTR and/or screenshot proof for offline bank / UPI payment.
// Never marks paid — committee reconciles separately.

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import { assertDonationAmountPaise, assertDonationMessage } from '@/lib/donations/validate';
import {
  assertOfflineProofFields,
  OFFLINE_PROOF_BUCKET,
  paymentProofObjectPath,
} from '@/lib/payments/bank-details';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUCCESS_MESSAGE =
  'Submitted for committee verification. You will be confirmed once reviewed.';

const REG_OPEN = ['pending', 'partial'] as const;

export async function POST(request: Request) {
  const me = await getCurrentAccount();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role === 'admin') {
    return NextResponse.json({ error: 'Committee accounts do not pay here' }, { status: 400 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4_500_000) {
    return NextResponse.json({ error: 'Screenshot must be 4 MB or smaller' }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Could not read upload' }, { status: 400 });
  }

  const sourceType = String(form.get('sourceType') || '').trim();
  if (sourceType !== 'registration' && sourceType !== 'donation') {
    return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 });
  }

  const screenshot = form.get('screenshot');
  const file = screenshot instanceof File ? screenshot : null;

  let proof;
  try {
    proof = assertOfflineProofFields({ utr: form.get('utr'), file });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Add a UTR reference or a payment screenshot' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const paymentAccountIdRaw = String(form.get('paymentAccountId') || '').trim();
  let accountQuery = admin.from('payment_accounts').select('id').eq('active', true);
  if (paymentAccountIdRaw) {
    accountQuery = accountQuery.eq('id', paymentAccountIdRaw);
  }
  const { data: account, error: accountError } = await accountQuery.maybeSingle();
  if (accountError || !account) {
    return NextResponse.json({ error: 'No active bank account configured' }, { status: 400 });
  }

  let sourceId = '';
  let donationAmountPaise = 0;
  let donationMessage: string | null = null;

  if (sourceType === 'registration') {
    sourceId = String(form.get('registrationId') || '').trim();
    if (!sourceId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
    }
    const { data: reg, error: regError } = await admin
      .from('event_registrations')
      .select('id')
      .eq('id', sourceId)
      .eq('account_id', me.id)
      .in('payment_status', [...REG_OPEN])
      .maybeSingle();
    if (regError || !reg) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    sourceId = reg.id;
  } else {
    sourceId = String(form.get('causeId') || '').trim();
    if (!sourceId) {
      return NextResponse.json({ error: 'causeId is required' }, { status: 400 });
    }
    try {
      donationAmountPaise = assertDonationAmountPaise(form.get('amountPaise'));
      donationMessage = assertDonationMessage(form.get('message'));
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid donation' },
        { status: 400 }
      );
    }
    const { data: cause, error: causeError } = await admin
      .from('donation_causes')
      .select('id')
      .eq('id', sourceId)
      .eq('active', true)
      .maybeSingle();
    if (causeError || !cause) {
      return NextResponse.json({ error: 'Cause not found' }, { status: 404 });
    }
    sourceId = cause.id;
  }

  let storagePath: string | null = null;
  if (proof.file && file) {
    const objectId = randomUUID();
    storagePath = paymentProofObjectPath(sourceType, sourceId, objectId, proof.file.ext);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(OFFLINE_PROOF_BUCKET)
      .upload(storagePath, buffer, { contentType: proof.file.type, upsert: false });
    if (uploadError) {
      console.error('offline proof upload', uploadError);
      return NextResponse.json({ error: 'Could not store screenshot' }, { status: 500 });
    }
  }

  const updateBase = {
    payment_account_id: account.id,
    updated_at: new Date().toISOString(),
    ...(proof.utr ? { bank_reference: proof.utr } : {}),
    ...(storagePath ? { bank_proof_storage_path: storagePath } : {}),
  };

  if (sourceType === 'registration') {
    const { error: updError } = await admin
      .from('event_registrations')
      .update(updateBase)
      .eq('id', sourceId);
    if (updError) {
      if (storagePath) {
        await admin.storage.from(OFFLINE_PROOF_BUCKET).remove([storagePath]).catch(() => undefined);
      }
      console.error('offline proof registration update', updError);
      return NextResponse.json({ error: 'Could not submit' }, { status: 500 });
    }
  } else {
    const { error: insertError } = await admin.from('donations').insert({
      account_id: me.id,
      cause_id: sourceId,
      amount_paise: donationAmountPaise,
      message: donationMessage,
      payment_status: 'pending',
      bank_reference: proof.utr,
      bank_proof_storage_path: storagePath,
      payment_account_id: account.id,
    });
    if (insertError) {
      if (storagePath) {
        await admin.storage.from(OFFLINE_PROOF_BUCKET).remove([storagePath]).catch(() => undefined);
      }
      console.error('offline proof donation insert', insertError);
      return NextResponse.json({ error: 'Could not submit' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
}
