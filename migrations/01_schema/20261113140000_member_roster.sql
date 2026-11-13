-- Base member roster from Unique Records (sfs1.xlsx). Used only for registration prefill lookup.
-- Not login accounts — alumni_accounts stays separate.

create table if not exists public.member_roster (
  id uuid primary key default gen_random_uuid(),
  record_id text not null,
  given_name text not null default '',
  last_name text not null default '',
  full_name text not null default '',
  batch integer,
  section text,
  current_location text,
  email text,
  phones text[] not null default '{}',
  food_preference text not null default 'veg',
  number_of_guests integer not null default 0,
  has_parking boolean not null default false,
  two_wheeler_count integer not null default 0,
  four_wheeler_count integer not null default 0,
  attending boolean not null default true,
  attendance_raw text,
  parking_raw text,
  review_needed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_roster_record_id_unique unique (record_id)
);

create index if not exists idx_member_roster_email_lower
  on public.member_roster (lower(email));

create index if not exists idx_member_roster_phones
  on public.member_roster using gin (phones);

create index if not exists idx_member_roster_full_name_lower
  on public.member_roster (lower(full_name));

alter table public.member_roster enable row level security;

revoke all on table public.member_roster from anon, authenticated;
grant all on table public.member_roster to service_role;
