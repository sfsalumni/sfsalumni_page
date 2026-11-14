import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const account = await getCurrentAccount();
    if (!account) {
      return NextResponse.json(
        { error: 'Not signed in' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    let payment_proof_pending = false;
    if (account.role === 'alumni' && account.jubilee_reg_status === 'pending_payment') {
      const admin = createAdminClient();
      const { data: pending } = await admin
        .from('offline_payment_proofs')
        .select('id')
        .eq('account_id', account.id)
        .eq('status', 'pending')
        .limit(1);
      payment_proof_pending = Array.isArray(pending) && pending.length > 0;
    }
    return NextResponse.json(
      { ...account, payment_proof_pending },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('me', err);
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }
}
