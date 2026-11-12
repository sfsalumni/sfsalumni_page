-- Active bank / UPI accounts for offline checkout + screenshot proof storage.

create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  account_name text not null,
  account_number text not null,
  ifsc text not null,
  bank_name text null,
  upi_id text null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active checkout account.
create unique index if not exists payment_accounts_one_active
  on public.payment_accounts ((active))
  where active = true;

alter table public.payment_accounts enable row level security;
revoke all on table public.payment_accounts from anon, authenticated;
grant all on table public.payment_accounts to service_role;

alter table public.event_registrations
  add column if not exists bank_proof_storage_path text null,
  add column if not exists payment_account_id uuid null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'event_registrations_payment_account_id_fkey'
  ) then
    alter table public.event_registrations
      add constraint event_registrations_payment_account_id_fkey
      foreign key (payment_account_id) references public.payment_accounts(id) on delete set null;
  end if;
end $$;

alter table public.donations
  add column if not exists bank_reference text null,
  add column if not exists bank_proof_storage_path text null,
  add column if not exists payment_account_id uuid null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'donations_payment_account_id_fkey'
  ) then
    alter table public.donations
      add constraint donations_payment_account_id_fkey
      foreign key (payment_account_id) references public.payment_accounts(id) on delete set null;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  4000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Seed one inactive placeholder so operators can activate after filling real details.
insert into public.payment_accounts (
  label, account_name, account_number, ifsc, bank_name, upi_id, active
)
select
  'SFS Alumni Jubilee',
  'TO BE CONFIRMED',
  '000000000000',
  'SBIN0000000',
  'TO BE CONFIRMED',
  null,
  true
where not exists (select 1 from public.payment_accounts limit 1);
