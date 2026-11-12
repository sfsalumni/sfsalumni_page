import { NextResponse } from 'next/server';
import { selectCatalog } from '@/lib/events/catalog-select';
import { eventIsOpen } from '@/lib/events/open';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await selectCatalog((columns) =>
    admin.from('event_catalog').select(columns).eq('published', true).order('starts_at', { ascending: true })
  );

  if (error) {
    console.error('public events', error);
    return NextResponse.json(
      { error: 'Events are not available yet. Apply the event_catalog migration.' },
      { status: 500 }
    );
  }
  const rows = (data || []) as unknown as { published?: boolean; starts_at: string; ends_at?: string | null }[];
  const open = rows.filter((row) => eventIsOpen(row, new Date(now)));
  return NextResponse.json(open, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
