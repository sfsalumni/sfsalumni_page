-- Singleton About the Association page copy (admin-maintained).

create table if not exists public.association_about (
  id text primary key default 'default' check (id = 'default'),
  eyebrow text not null,
  title text not null,
  purpose_heading text not null,
  purpose_body text not null,
  purpose_note text,
  cta_label text not null default 'Visit member portal ↗',
  cta_href text not null default '/member',
  highlight_eyebrow text not null,
  highlight_title text not null,
  highlight_body text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.association_about enable row level security;

revoke all on table public.association_about from anon, authenticated;
grant all on table public.association_about to service_role;

insert into public.association_about (
  id,
  eyebrow,
  title,
  purpose_heading,
  purpose_body,
  purpose_note,
  cta_label,
  cta_href,
  highlight_eyebrow,
  highlight_title,
  highlight_body,
  published
)
values (
  'default',
  'ABOUT THE SFS ALUMNI ASSOCIATION',
  'An association for every generation',
  'Our purpose',
  'The SFS Alumni Association brings together former students of St. Francis de Sales High School, Shanti Nagar, Secunderabad. It exists to preserve shared memories, strengthen lifelong friendships, support current students and contribute to the school''s future.',
  'This is proposed copy. The alumni committee should approve the final mission statement, constitution, membership rules and contact details before publication.',
  'Visit member portal ↗',
  '/member',
  '1976–2026',
  '50 years of SFS',
  'A school legacy carried forward by students, teachers, families and alumni across generations.',
  true
)
on conflict (id) do nothing;
