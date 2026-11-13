import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { restorePaymentAccountFields } from '@/lib/payments/soft-delete';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT =
  'id,label,account_name,account_number,ifsc,bank_name,upi_id,active,sort_order,deleted_at,created_at,updated_at';

const SOFT_DELETE_MIGRATION =
  'Soft delete is not available yet. Apply the payment_accounts deleted_at migration.';

export async function POST(
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
  const { data, error } = await admin
    .from('payment_accounts')
    .update(restorePaymentAccountFields())
    .eq('id', id)
    .select(SELECT)
    .maybeSingle();

  if (error?.message?.includes('deleted_at') || error?.code === '42703') {
    return NextResponse.json({ error: SOFT_DELETE_MIGRATION }, { status: 500 });
  }
  if (error || !data) {
    console.error('admin payment account restore', error);
    return NextResponse.json({ error: 'Could not restore account' }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}
