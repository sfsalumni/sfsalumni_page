import { NextResponse } from 'next/server';
import { selectCatalog } from '@/lib/events/catalog-select';
import { eventIsOpen } from '@/lib/events/open';
import { isEventSoftDeleted } from '@/lib/events/soft-delete';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: Request, ctx: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data, error } = await selectCatalog((columns) =>
    admin.from('event_catalog').select(columns).eq('id', ctx.params.id).eq('published', true).maybeSingle()
  );

  const row = data as unknown as {
    published?: boolean;
    starts_at: string;
    ends_at?: string | null;
    deleted_at?: string | null;
  } | null;
  if (error || !row || isEventSoftDeleted(row) || !eventIsOpen(row, new Date())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
