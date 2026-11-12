-- Singleton homepage welcome / principal message (admin-maintained).

create table if not exists public.welcome_message (
  id text primary key default 'default' check (id = 'default'),
  leadership_label text not null default 'School Leadership',
  person_name text not null,
  person_title text not null,
  theme text,
  headline text not null,
  body text not null,
  quote text,
  signature_name text not null,
  signature_role text not null,
  cta_label text not null default 'Reconnect with SFS',
  cta_href text not null default '#gallery-section',
  photo_path text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.welcome_message enable row level security;

revoke all on table public.welcome_message from anon, authenticated;
grant all on table public.welcome_message to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'welcome-photos',
  'welcome-photos',
  true,
  4000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Unpublished draft so the public section stays hidden until an admin publishes.
insert into public.welcome_message (
  id,
  leadership_label,
  person_name,
  person_title,
  theme,
  headline,
  body,
  quote,
  signature_name,
  signature_role,
  cta_label,
  cta_href,
  published
)
values (
  'default',
  'School Leadership',
  'Fr. Anil Kumar R',
  'Principal, SFS Shanthinagar',
  'Aspire to Achieve',
  'Principal''s Jubilee Welcome Message',
  E'As we celebrate the Golden Jubilee of our beloved institution—50 glorious years of excellence, service, and transformation—we pay tribute to the unwavering dedication of all who have walked through SFS halls.\n\nTo our generations of alumni and teachers: you are the bedrock of this legacy. Let us honour our rich past, cherish our milestones, and move forward with renewed unity and commitment to inspire the future.',
  'Success is not final, failure is not fatal: it is the courage to continue that counts.',
  'Rev. Fr. Anil Kumar R',
  'Principal • Golden Jubilee Year',
  'Reconnect with SFS',
  '#gallery-section',
  false
)
on conflict (id) do nothing;
