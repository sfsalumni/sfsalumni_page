// app/api/admin/registrations/[id]/route.ts
// Committee actions on one registration.
// - payment_status: 'paid' settles the fee and any linked donation in full and issues the code;
//   'pending' clears payment on both and nullifies the registration code.

import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import {
  applyRegistrationPayment,
  markRegistrationUnpaid,
} from '@/lib/events/mark-paid';

type PatchBody = {
  payment_status?: unknown;
};

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const registrationId = String(id || '').trim();
  if (!registrationId) return NextResponse.json({ error: 'Registration id is required' }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as PatchBody;
  if (body.payment_status === undefined) {
    return NextResponse.json({ error: 'Send payment_status' }, { status: 400 });
  }

  const status = String(body.payment_status || '');
  if (status !== 'paid' && status !== 'pending') {
    return NextResponse.json({ error: 'payment_status must be paid or pending' }, { status: 400 });
  }

  const result =
    status === 'paid'
      ? await applyRegistrationPayment({ registrationId, settleFull: true })
      : await markRegistrationUnpaid(registrationId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response: Record<string, unknown> = {
    ok: true,
    payment_status: result.payment_status,
    amount_paid_paise: result.amount_paid_paise,
  };
  if ('amount_due_paise' in result) response.amount_due_paise = result.amount_due_paise;
  if ('registration_code' in result) response.registration_code = result.registration_code;

  return NextResponse.json(response);
}
