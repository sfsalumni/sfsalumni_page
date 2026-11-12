import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { createAdminClient } from '@/lib/supabase-admin';

const ALLOWED = new Set(['pending', 'verified', 'rejected', 'suspended']);

export async function POST(request: Request) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const id = String(body.id || '');
    const status = String(body.status || '');
    if (!id || !ALLOWED.has(status)) {
      return NextResponse.json(
        { error: 'id and a valid status (pending|verified|rejected|suspended) are required' },
        { status: 400 }
      );
    }
    if (id === me.id) {
      return NextResponse.json({ error: 'You cannot change your own membership status' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('alumni_accounts')
      .update({
        member_status: status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: me.id,
      })
      .eq('id', id);

    if (error) {
      console.error('admin decide', error);
      return NextResponse.json({ error: 'Could not update membership' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('admin decide', err);
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 });
  }
}
