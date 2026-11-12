import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const id = String(body.id || '');
    const role = body.role === 'admin' || body.role === 'alumni' ? body.role : null;
    if (!id || !role) {
      return NextResponse.json({ error: 'id and role (admin|alumni) are required' }, { status: 400 });
    }
    if (id === me.id) {
      return NextResponse.json({ error: 'You cannot change your own admin role' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: target, error: loadError } = await admin
      .from('alumni_accounts')
      .select('id,role,member_status')
      .eq('id', id)
      .maybeSingle();

    if (loadError || !target) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (role === 'admin' && target.member_status !== 'verified') {
      return NextResponse.json(
        { error: 'Only verified members can be made admin' },
        { status: 400 }
      );
    }

    if (role === 'alumni' && target.role === 'admin') {
      const { count, error: countError } = await admin
        .from('alumni_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('member_status', 'verified');
      if (countError) {
        console.error('admin role count', countError);
        return NextResponse.json({ error: 'Could not update role' }, { status: 500 });
      }
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last verified admin' },
          { status: 400 }
        );
      }
    }

    const { error } = await admin.from('alumni_accounts').update({ role }).eq('id', id);
    if (error) {
      console.error('admin role', error);
      return NextResponse.json({ error: 'Could not update role' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('admin role', err);
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 });
  }
}
