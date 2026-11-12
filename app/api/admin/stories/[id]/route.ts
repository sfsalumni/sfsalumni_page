import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import {
  ensureAlumniIdInLegacyUsers,
  isLegacyUsersFkError,
} from '@/lib/stories/legacy-fk-bridge';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['published', 'rejected']);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = String(params.id || '');
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid story id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const status = String(body.status || '');
    if (!ALLOWED.has(status)) {
      return NextResponse.json(
        { error: 'status must be published or rejected' },
        { status: 400 }
      );
    }

    const review_note =
      body.review_note != null && String(body.review_note).trim()
        ? String(body.review_note).trim()
        : null;

    const admin = createAdminClient();
    const payload = {
      status,
      review_note: status === 'rejected' ? review_note : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: me.id,
    };

    let { data, error } = await admin
      .from('alumni_stories')
      .update(payload)
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (isLegacyUsersFkError(error)) {
      try {
        await ensureAlumniIdInLegacyUsers(admin, me);
      } catch (bridgeErr) {
        console.error('admin stories reviewer bridge', bridgeErr);
        return NextResponse.json({ error: 'Could not update story' }, { status: 500 });
      }
      ({ data, error } = await admin
        .from('alumni_stories')
        .update(payload)
        .eq('id', id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle());
    }

    if (error) {
      console.error('admin stories patch', error);
      return NextResponse.json({ error: 'Could not update story' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: 'Story not found or already reviewed' },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('admin stories PATCH', err);
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 });
  }
}
