-- Optional Instagram link per event (hero CTA next to Register).

alter table public.event_catalog
  add column if not exists instagram_url text;

comment on column public.event_catalog.instagram_url is
  'Optional Instagram URL for the landing hero; blank hides the button for this event.';

-- One-time copy from site-wide site_links onto the primary event when blank.
update public.event_catalog e
set instagram_url = s.instagram_url
from public.site_links s
where e.is_primary = true
  and (e.instagram_url is null or btrim(e.instagram_url) = '')
  and s.instagram_url is not null
  and btrim(s.instagram_url) <> '';
