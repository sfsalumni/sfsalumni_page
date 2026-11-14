-- Portal sidebar / home visibility toggles (admin Maintenance).
-- Day-1 defaults: Donate, Stories, Memories, Submissions, home lanes OFF.
-- Home and Events stay always visible in the app.

create table if not exists public.portal_menu (
  id text primary key default 'default' check (id = 'default'),
  show_donate boolean not null default false,
  show_stories boolean not null default false,
  show_memories boolean not null default false,
  show_submissions boolean not null default false,
  show_home_lanes boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portal_menu enable row level security;

revoke all on table public.portal_menu from public, anon, authenticated;
grant all on table public.portal_menu to service_role;

insert into public.portal_menu (
  id,
  show_donate,
  show_stories,
  show_memories,
  show_submissions,
  show_home_lanes
)
values ('default', false, false, false, false, false)
on conflict (id) do nothing;
