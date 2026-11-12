import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('alumni_accounts')
      .select('id,full_name,email,phone_number,batch,role,member_status,created_at,reviewed_at')
      .eq('member_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('admin pending', error);
      return NextResponse.json({ error: 'Could not load pending applications' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('admin pending', err);
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 });
  }
}
