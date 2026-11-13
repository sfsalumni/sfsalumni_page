import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** Full member directory for Maintenance (capped). */
export async function GET(request: Request) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get('q') || '').trim();

  const admin = createAdminClient();
  let query = admin
    .from('alumni_accounts')
    .select('id,full_name,email,phone_number,batch,role,member_status,username,created_at')
    .order('full_name', { ascending: true })
    .limit(500);

  if (q) {
    const safe = q.replace(/[%_,()"]/g, '').slice(0, 80);
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `full_name.ilike."${pattern}",email.ilike."${pattern}",phone_number.ilike."${pattern}",username.ilike."${pattern}"`
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('maintenance members list', error);
    return NextResponse.json({ error: 'Could not load members' }, { status: 500 });
  }

  return NextResponse.json({ members: data || [], me_id: me.id });
}
