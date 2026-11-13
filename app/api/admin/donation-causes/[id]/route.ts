import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { donationCauseDeleteMessage } from '@/lib/donations/cause-delete';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  if (body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    patch.title = title;
  }
  if (body.description !== undefined) {
    patch.description = String(body.description || '').trim() || null;
  }
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (body.sort_order !== undefined) patch.sort_order = Math.trunc(Number(body.sort_order) || 0);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('donation_causes')
    .update(patch)
    .eq('id', id)
    .select('id,title,description,active,sort_order,created_at,updated_at')
    .maybeSingle();

  if (error || !data) {
    console.error('admin donation cause patch', error);
    return NextResponse.json({ error: 'Could not update cause' }, { status: 500 });
  }

  return NextResponse.json({ cause: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = String(params.id || '');
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('donation_causes')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Donation type not found' }, { status: 404 });
    }

    const { error } = await admin.from('donation_causes').delete().eq('id', id);
    if (error) {
      console.error('admin donation cause delete', error);
      const status = error.code === '23503' ? 409 : 500;
      return NextResponse.json({ error: donationCauseDeleteMessage(error) }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('admin donation cause delete', err);
    return NextResponse.json({ error: donationCauseDeleteMessage(null) }, { status: 500 });
  }
}
