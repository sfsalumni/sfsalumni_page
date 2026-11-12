# Spec: Table-based email/password auth (hobby)

**Status:** awaiting approval  
**Date:** 2026-10-25  
**Project:** SFS Alumni Golden Jubilee portal

## Goal

Alumni create accounts and sign in with email + password **without** Supabase Auth users. Credentials live in an app table. Supabase remains the database host; the browser does not call `supabase.auth.signUp` / `signInWithPassword` for alumni.

## Non-goals

- Email confirmation / SMTP / password-reset email (hobby)
- OAuth / magic links
- Migrating existing Supabase Auth alumni (none required for hobby restart)
- Changing Golden Jubilee public marketing pages beyond auth entry points

## Actors

| Actor | How they authenticate | Capabilities |
|---|---|---|
| Alumni | Email + password against app table | Pending until verified; then member portal |
| Admin | Same table, `role = 'admin'` and `member_status = 'verified'` | Membership review (`/admin`) |

No separate Supabase Auth admin identity in v1.

## Data model

New table `public.alumni_accounts` (name may be adjusted in plan if reusing `public.users` without `auth.users` FK is cleaner — prefer **new table** to avoid fighting the Auth-linked migration):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `email` | text unique not null | lowercased |
| `password_hash` | text not null | bcrypt or argon2 |
| `full_name` | text not null | |
| `phone_number` | text | |
| `role` | text | `alumni` \| `admin`, default `alumni` |
| `member_status` | text | `pending` \| `verified` \| `rejected` \| `suspended`, default `pending` |
| `batch` | integer | optional |
| `created_at` | timestamptz | default now() |
| `reviewed_at` | timestamptz | nullable |
| `reviewed_by` | uuid | nullable FK to `alumni_accounts.id` |

Directory/profile fields already on portal (`current_location`, `profession`, `bio`, `profile_visibility`) may be added to this table or kept elsewhere in a follow-up; v1 needs enough for MemberGate + admin queue.

**RLS:** deny all direct client access to `password_hash`. Prefer **no anon/authenticated table grants** for this table; only the **server** (service role) reads/writes after session checks.

Existing `public.users` Auth-trigger migration remains unused by the new flow; do not delete in v1 unless plan explicitly migrates references.

## Session

- After successful signup/login, server sets an **httpOnly**, `Secure` (prod), `SameSite=Lax` cookie.
- Cookie payload: signed session containing at least `accountId`, `email`, `role`, `member_status` (or fetch those on each request from DB by `accountId`).
- Signing secret: `AUTH_SECRET` (or `SESSION_SECRET`) in `.env.local` / Vercel — **not** `NEXT_PUBLIC_*`.
- Logout clears the cookie.
- Session TTL: e.g. 7–14 days hobby default; sliding refresh optional (skip in v1).

## Server API (App Router)

| Route | Method | Behavior |
|---|---|---|
| `/api/auth/signup` | POST | Validate input → hash password → insert row → set session → `{ ok: true }` |
| `/api/auth/login` | POST | Lookup email → verify hash → set session |
| `/api/auth/logout` | POST | Clear session |
| `/api/auth/me` | GET | Return current account sans password hash, or 401 |

Optional later: admin approve/reject via `/api/admin/...` using service role; v1 may keep admin page calling server helpers.

## UI changes

- `/signup`: keep fields; submit to `/api/auth/signup` instead of `supabase.auth.signUp`.
- `/login`: submit to `/api/auth/login` instead of `signInWithPassword`.
- `MemberGate`: check `/api/auth/me` (or cookie-backed helper), not `supabase.auth.getUser()` + Auth-linked `users`.
- `NavBar`: session from `/api/auth/me`; logout hits `/api/auth/logout`.
- Remove client `createClient()` usage for auth flows. Supabase browser client may remain for public reads only if still needed; member data should go through server.

## Supabase access pattern

- Server-only Supabase client with **service role** key: `SUPABASE_SERVICE_ROLE_KEY` (never `NEXT_PUBLIC_`).
- Anon key may stay for non-auth public content if any; do not use it to read `password_hash`.
- Update `.env.example` accordingly.

## Provisioning first admin

Documented one-liner after first signup (SQL Editor):

```sql
update public.alumni_accounts
set role = 'admin', member_status = 'verified'
where email = 'your@email.com';
```

## Security requirements

- Passwords hashed with bcrypt (cost ≥ 10) or argon2; never store plaintext.
- Constant-time compare via library verify helper.
- Rate-limit login/signup lightly in-process or skip with a comment for hobby v1 (note as known ceiling).
- Service role and `AUTH_SECRET` only on server / Vercel env.

## Acceptance tests

1. Signup with new email creates one `alumni_accounts` row and a session cookie; no row in `auth.users` for that email.
2. Login with correct password sets session; wrong password returns 401 and no session.
3. `/member` blocked when logged out; allowed when `member_status = verified`.
4. Pending user sees pending gate, not directory data.
5. Admin user can open `/admin` and approve/reject pending accounts (updates table).
6. Logout clears access to `/member`.

## Out of scope follow-ups

- Wire directory/events to `alumni_accounts` IDs end-to-end if they still reference Auth `users.id`
- Password reset email
- Removing old Auth migration / `public.users` trigger

## Approval

Reply **approve spec** to proceed to the implementation plan, or list edits.
