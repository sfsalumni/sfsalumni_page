-- Offline payment proofs queue (committee approve/reject) + payment_accounts.sort_order.

alter table public.payment_accounts
  add column if not exists sort_order integer not null default 0;

create index if not exists idx_payment_accounts_sort
  on public.payment_accounts (sort_order, label);

create table if not exists public.offline_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('registration', 'donation')),
  registration_id uuid references public.event_registrations (id) on delete cascade,
  donation_id uuid references public.donations (id) on delete cascade,
  account_id uuid not null references public.alumni_accounts (id) on delete restrict,
  payment_account_id uuid references public.payment_accounts (id) on delete set null,
  amount_paise integer not null check (amount_paise >= 100),
  utr text,
  screenshot_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references public.alumni_accounts (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offline_proof_source_xor check (
    (source_type = 'registration' and registration_id is not null and donation_id is null)
    or (source_type = 'donation' and donation_id is not null and registration_id is null)
  )
);

create index if not exists idx_offline_proofs_status_created
  on public.offline_payment_proofs (status, created_at desc);

create index if not exists idx_offline_proofs_registration
  on public.offline_payment_proofs (registration_id)
  where registration_id is not null;

create index if not exists idx_offline_proofs_donation
  on public.offline_payment_proofs (donation_id)
  where donation_id is not null;

alter table public.offline_payment_proofs enable row level security;
revoke all on table public.offline_payment_proofs from anon, authenticated;
grant all on table public.offline_payment_proofs to service_role;
