-- Soft-delete for event catalog rows (admin blur + reset).

alter table public.event_catalog
  add column if not exists deleted_at timestamptz;

comment on column public.event_catalog.deleted_at is
  'When set, event is soft-deleted: hidden from public surfaces, restorable in admin';

create index if not exists idx_event_catalog_deleted_at
  on public.event_catalog (deleted_at);
