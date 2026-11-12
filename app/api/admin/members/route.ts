import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { createAdminClient } from '@/lib/supabase-admin';

const STATUSES = new Set(['pending', 'verified', 'rejected', 'suspended']);

export async function GET(request: Request) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();
    const status = String(searchParams.get('status') || '').trim();

    const admin = createAdminClient();
    let query = admin
      .from('alumni_accounts')
      .select(
        'id,full_name,email,phone_number,batch,role,member_status,created_at,reviewed_at'
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && STATUSES.has(status)) {
      query = query.eq('member_status', status);
    }

    if (q) {
      const safe = q.replace(/[%_,()"]/g, '').slice(0, 80);
      if (safe) {
        const pattern = `%${safe}%`;
        query = query.or(
          `full_name.ilike."${pattern}",email.ilike."${pattern}",phone_number.ilike."${pattern}"`
        );
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('admin members', error);
      return NextResponse.json({ error: 'Could not load members' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('admin members', err);
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 });
  }
}
