-- Typography / color overrides for the homepage welcome message.

alter table public.welcome_message
  add column if not exists style jsonb not null default '{}'::jsonb;
