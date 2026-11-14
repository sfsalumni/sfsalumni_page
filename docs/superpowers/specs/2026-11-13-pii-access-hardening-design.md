# PII and roster access hardening — design

**Date:** 2026-11-13  
**Status:** Approved  
**Approach:** Harden Postgres grants/RLS for API clients + restrict Supabase org dashboard access (no field encryption)

## Goal

User-related data and member roster data must be inaccessible to non-admins via the Supabase API (anon / authenticated roles) and tightly controlled for anyone with Supabase dashboard access. App admins keep full access through the Next.js admin APIs, which use the service role on the server only.

## Non-goals

- Encrypting PII columns / Supabase Vault ciphertext (deferred; would break roster lookup and imports).
- Changing app admin RBAC inside the portal (`alumni_accounts.role`).
- Deleting the legacy `public.users` table (revoke/document only unless separately approved).
- Removing intentional public `committee_members` read access.

## Threat model (chosen: both)

| Threat | Control |
|--------|---------|
| Leaked anon key, browser client, or authenticated JWT hitting PostgREST | RLS + `REVOKE` from `anon`/`authenticated`; no permissive policies that grant table access |
| Extra people on the Supabase project / org | Org membership: only needed Owners/Admins; rotate keys if exposure suspected |
| Project Owner Table Editor / SQL | **Cannot** be blocked by RLS; owners bypass RLS. Mitigate by who holds Owner/Admin |

## Current state

Table-auth app already uses **service role only on the server** (`createAdminClient`). Many PII tables already follow:

- `ENABLE ROW LEVEL SECURITY`
- `REVOKE ALL … FROM anon, authenticated`
- `GRANT ALL … TO service_role`

### Already locked (keep / reaffirm in audit)

- `alumni_accounts`
- `member_roster`
- `event_registrations`
- `event_catalog`
- `donations`
- `donation_causes`
- `offline_payment_proofs`
- `payment_accounts`
- `password_reset_tokens`
- `alumni_stories`
- `alumni_memories`
- `welcome_message`, `association_about`, `site_links` (CMS; same pattern)

### Gaps

1. **`push_subscriptions`**, **`event_broadcasts`** — RLS enabled in `20261101_push_and_broadcasts.sql` but **no** `REVOKE`/`GRANT` to `service_role`.
2. **Legacy Auth-era policies** on `public.users`, `alumni_events`, `alumni_stories`, `alumni_memories` targeting `authenticated` (from `20261025_sfs_alumni_portal.sql`). Table grants were later revoked for stories/memories; policies should still be dropped for hygiene. Confirm `alumni_events` grants match the service-role-only pattern.
3. **`public.users`** — legacy Auth profile table with policies for `authenticated`. If unused by the live table-auth app: enable RLS (already), revoke from `anon`/`authenticated`, grant only `service_role`; leave data in place.

### Intentional public read (do not lock)

- `committee_members` — `GRANT SELECT` to `anon`/`authenticated` + `committee_members_public_read` policy.

## Design

### A. Hardening migration

Add a single migration (mirrored under `supabase/migrations/` and `migrations/01_schema/`):

1. For each **PII / sensitive** table in the locked list + gaps:  
   - `ALTER TABLE … ENABLE ROW LEVEL SECURITY;`  
   - `REVOKE ALL ON TABLE … FROM PUBLIC, anon, authenticated;`  
   - `GRANT ALL ON TABLE … TO service_role;`
2. Drop named legacy policies on `users`, `alumni_events`, `alumni_stories`, `alumni_memories` that grant `authenticated` access (use `DROP POLICY IF EXISTS` with exact names from `20261025_sfs_alumni_portal.sql`).
3. Do **not** add new policies that allow `anon`/`authenticated` to read PII or roster.
4. Do **not** change `committee_members` public select.

Idempotent: safe to re-run revoke/grant/drop policy.

### B. App / keys (verify, minimal code change)

- Confirm no browser path uses `SUPABASE_SERVICE_ROLE_KEY`.
- Anon/publishable key may remain public for intentional non-PII reads (e.g. committee) only.
- Document in `.env.example`: service role is server-only.

### C. Supabase org checklist (manual; operators run in UI)

1. List org/project members.
2. Keep Owner/Admin only for people who must use Table Editor or manage secrets (ideally 1–2).
3. Remove or demote everyone else.
4. Confirm service role key exists only in Vercel server env + local `.env.local`.
5. Rotate anon + service role keys if prior exposure is plausible.
6. Prefer Admin UI / approved scripts for PII changes; avoid ad-hoc SQL dumps.

### D. Verification

- With anon key: `SELECT` on `member_roster`, `alumni_accounts`, `event_registrations` returns permission error / empty denied.
- With service role (or admin import API): roster count/import/clear still works.
- Public committee page still loads.

## Out of scope follow-ups

- Column encryption / tokenization for dashboard-visible ciphertext.
- Dropping unused `public.users` and Auth helper functions after confirming zero references.
- Automating Supabase org roles from CI (not supported meaningfully from app repo).

## Success criteria

- Non-admin API clients cannot read or write user PII or roster rows.
- Gaps (`push_subscriptions`, `event_broadcasts`, legacy policies) closed.
- Operators have a written dashboard access checklist.
- App admin flows for roster and membership continue to work via service role.
