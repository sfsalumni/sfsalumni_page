import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { missingColumn } from '@/lib/events/registration-code';
import { restoreFields } from '@/lib/events/soft-delete';
import { EVENT_SELECT } from '@/lib/events/types';
import { createAdminClient } from '@/lib/supabase-admin';

type Ctx = { params: { id: string } };

export async function POST(_request: Request, ctx: Ctx) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = ctx.params.id;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('event_catalog')
    .update(restoreFields())
    .eq('id', id)
    .select(EVENT_SELECT)
    .maybeSingle();

  if (error && missingColumn(error)) {
    return NextResponse.json(
      { error: 'Soft delete is not available yet. Apply the event_catalog deleted_at migration.' },
      { status: 500 }
    );
  }
  if (error || !data) {
    console.error('admin events restore', error);
    return NextResponse.json({ error: error?.message || 'Could not restore event' }, { status: 500 });
  }
  return NextResponse.json(data);
}
