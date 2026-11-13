-- Singleton landing-page social / CTA links (admin-maintained).

create table if not exists public.site_links (
  id text primary key default 'default' check (id = 'default'),
  instagram_url text,
  instagram_label text not null default 'Instagram',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_links enable row level security;

revoke all on table public.site_links from anon, authenticated;
grant all on table public.site_links to service_role;

insert into public.site_links (id, instagram_url, instagram_label, published)
values (
  'default',
  'https://www.instagram.com/sfs.alumni.group/reels/',
  'Instagram',
  true
)
on conflict (id) do nothing;
