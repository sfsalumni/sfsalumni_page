import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { assertPaymentAccountInput, normalizeIfsc } from '@/lib/payments/bank-details';
import { softDeletePaymentAccountFields } from '@/lib/payments/soft-delete';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT =
  'id,label,account_name,account_number,ifsc,bank_name,upi_id,active,sort_order,deleted_at,created_at,updated_at';

const SOFT_DELETE_MIGRATION =
  'Soft delete is not available yet. Apply the payment_accounts deleted_at migration.';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = String(params.id || '');
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.label !== undefined || body.accountName !== undefined || body.account_name !== undefined) {
    try {
      const fields = assertPaymentAccountInput({
        ...body,
        active: body.active !== undefined ? body.active : false,
      } as Record<string, unknown>);
      Object.assign(patch, fields);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid account' },
        { status: 400 }
      );
    }
  } else {
    if (body.active !== undefined) patch.active = Boolean(body.active);
    if (body.sort_order !== undefined || body.sortOrder !== undefined) {
      patch.sort_order = Math.trunc(Number(body.sortOrder ?? body.sort_order) || 0);
    }
    if (body.ifsc !== undefined) {
      const ifsc = normalizeIfsc(body.ifsc);
      if (!ifsc) return NextResponse.json({ error: 'Valid IFSC is required' }, { status: 400 });
      patch.ifsc = ifsc;
    }
  }

  const admin = createAdminClient();

  const { data: current, error: currentErr } = await admin
    .from('payment_accounts')
    .select('id,deleted_at')
    .eq('id', id)
    .maybeSingle();

  if (currentErr && !(currentErr.message?.includes('deleted_at') || currentErr.code === '42703')) {
    console.error('admin payment account patch lookup', currentErr);
    return NextResponse.json({ error: 'Could not update account' }, { status: 500 });
  }
  if (!current && !currentErr) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }
  if (current?.deleted_at) {
    return NextResponse.json(
      { error: 'Restore this account before editing or activating it' },
      { status: 400 }
    );
  }

  if (patch.active === true) {
    const { error: clearErr } = await admin
      .from('payment_accounts')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('active', true)
      .neq('id', id);
    if (clearErr) {
      console.error('admin payment account clear active', clearErr);
      return NextResponse.json({ error: 'Could not update account' }, { status: 500 });
    }
  }

  const { data, error } = await admin
    .from('payment_accounts')
    .update(patch)
    .eq('id', id)
    .select(SELECT)
    .maybeSingle();

  if (error?.message?.includes('deleted_at') || error?.code === '42703') {
    const retry = await admin
      .from('payment_accounts')
      .update(patch)
      .eq('id', id)
      .select(
        'id,label,account_name,account_number,ifsc,bank_name,upi_id,active,sort_order,created_at,updated_at'
      )
      .maybeSingle();
    if (retry.error || !retry.data) {
      console.error('admin payment account patch', retry.error);
      return NextResponse.json({ error: 'Could not update account' }, { status: 500 });
    }
    return NextResponse.json({ account: retry.data });
  }

  if (error || !data) {
    console.error('admin payment account patch', error);
    return NextResponse.json({ error: 'Could not update account' }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = String(params.id || '');
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing, error: lookupErr } = await admin
    .from('payment_accounts')
    .select('id,active,deleted_at')
    .eq('id', id)
    .maybeSingle();

  if (lookupErr?.message?.includes('deleted_at') || lookupErr?.code === '42703') {
    return NextResponse.json({ error: SOFT_DELETE_MIGRATION }, { status: 500 });
  }
  if (lookupErr) {
    console.error('admin payment account delete lookup', lookupErr);
    return NextResponse.json({ error: 'Could not delete account' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }
  if (existing.deleted_at) {
    return NextResponse.json({ error: 'Account is already deleted' }, { status: 400 });
  }

  const wasActive = Boolean(existing.active);
  const { data, error } = await admin
    .from('payment_accounts')
    .update(softDeletePaymentAccountFields())
    .eq('id', id)
    .select(SELECT)
    .maybeSingle();

  if (error?.message?.includes('deleted_at') || error?.code === '42703') {
    return NextResponse.json({ error: SOFT_DELETE_MIGRATION }, { status: 500 });
  }
  if (error || !data) {
    console.error('admin payment account soft delete', error);
    return NextResponse.json({ error: 'Could not delete account' }, { status: 500 });
  }

  return NextResponse.json({ account: data, wasActive });
}
