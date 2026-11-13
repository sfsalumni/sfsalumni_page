-- Soft-delete for bank / UPI payment accounts (row kept; hidden from checkout).

alter table public.payment_accounts
  add column if not exists deleted_at timestamptz null;

comment on column public.payment_accounts.deleted_at is
  'When set, account is soft-deleted: hidden from checkout and editable only via restore.';

-- One active checkout account among non-deleted rows only.
drop index if exists public.payment_accounts_one_active;
create unique index payment_accounts_one_active
  on public.payment_accounts ((active))
  where active = true and deleted_at is null;
