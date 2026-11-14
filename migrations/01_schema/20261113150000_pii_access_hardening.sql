-- PII / roster access hardening: API clients (anon, authenticated) get no table
-- privileges. App admins use service_role via server-only createAdminClient.
-- Supabase dashboard Owners still bypass RLS — control that via org membership.
-- Does not change committee_members public SELECT.

-- Sensitive tables: reaffirm RLS + revoke client roles + grant service_role.
do $$
declare
  t text;
  tables text[] := array[
    'alumni_accounts',
    'member_roster',
    'event_registrations',
    'event_catalog',
    'donations',
    'donation_causes',
    'offline_payment_proofs',
    'payment_accounts',
    'password_reset_tokens',
    'alumni_stories',
    'alumni_memories',
    'alumni_events',
    'push_subscriptions',
    'event_broadcasts',
    'welcome_message',
    'association_about',
    'site_links',
    'users'
  ];
begin
  foreach t in array tables
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

-- Drop legacy Auth-era policies (names from 20261025_sfs_alumni_portal.sql).
do $$
begin
  if to_regclass('public.users') is not null then
    drop policy if exists "SFS users read own profile or admins read users" on public.users;
    drop policy if exists "SFS admins review membership" on public.users;
    drop policy if exists "SFS users create own pending profile" on public.users;
  end if;

  if to_regclass('public.alumni_events') is not null then
    drop policy if exists "SFS verified members read published events" on public.alumni_events;
    drop policy if exists "SFS admins manage events" on public.alumni_events;
  end if;

  if to_regclass('public.alumni_stories') is not null then
    drop policy if exists "SFS verified members read published stories" on public.alumni_stories;
    drop policy if exists "SFS verified members submit stories" on public.alumni_stories;
    drop policy if exists "SFS admins manage stories" on public.alumni_stories;
  end if;

  if to_regclass('public.alumni_memories') is not null then
    drop policy if exists "SFS verified members read published memories" on public.alumni_memories;
    drop policy if exists "SFS verified members submit memories" on public.alumni_memories;
    drop policy if exists "SFS admins manage memories" on public.alumni_memories;
  end if;
end $$;
