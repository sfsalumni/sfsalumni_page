// Returns the single active payment account for offline bank / UPI checkout.

import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import { toBankAccountPublic } from '@/lib/payments/bank-details';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const me = await getCurrentAccount();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('payment_accounts')
    .select('id,label,account_name,account_number,ifsc,bank_name,upi_id')
    .eq('active', true)
    .maybeSingle();

  if (error) {
    console.error('active payment account', error);
    return NextResponse.json({ error: 'Could not load bank details' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'No active bank account configured' }, { status: 404 });
  }

  return NextResponse.json(
    { account: toBankAccountPublic(data) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
