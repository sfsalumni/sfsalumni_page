import { selectCatalog } from '@/lib/events/catalog-select';
import { isEventSoftDeleted } from '@/lib/events/soft-delete';
import { createAdminClient } from '@/lib/supabase-admin';
import { type EventCatalog } from '@/lib/events/types';

export async function getPrimaryEvent(): Promise<EventCatalog | null> {
  const admin = createAdminClient();
  const { data, error } = await selectCatalog((columns) =>
    admin.from('event_catalog').select(columns).eq('is_primary', true).maybeSingle()
  );
  if (error || !data) return null;
  const event = data as unknown as EventCatalog;
  if (isEventSoftDeleted(event)) return null;
  return event;
}

export async function getPrimaryEventId(): Promise<string | null> {
  const row = await getPrimaryEvent();
  return row?.id ?? null;
}
