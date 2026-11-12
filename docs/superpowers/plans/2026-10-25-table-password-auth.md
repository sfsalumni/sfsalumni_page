# Table-based email/password auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase Auth signup/login for alumni with email+password stored (hashed) in `alumni_accounts` and httpOnly app sessions.

**Architecture:** Browser posts to Next.js Route Handlers; handlers use bcrypt + signed session cookie; DB access for accounts uses a server-only Supabase service-role client. MemberGate/NavBar/admin read session via `/api/auth/me`, not `supabase.auth`.

**Tech Stack:** Next.js 14 App Router, TypeScript, `bcryptjs`, `jose` (HMAC JWT cookie), `@supabase/supabase-js` service role on server only.

**Spec:** `docs/superpowers/specs/2026-10-25-table-password-auth.md`

## Global Constraints

- No `supabase.auth.signUp` / `signInWithPassword` / `getUser` / `signOut` for alumni flows after this plan.
- Never put `SUPABASE_SERVICE_ROLE_KEY` or `AUTH_SECRET` in `NEXT_PUBLIC_*` or client bundles.
- Passwords: bcrypt via `bcryptjs`, cost factor `10`; store only `password_hash`.
- Emails stored lowercased; unique.
- Hobby: no email confirmation, no password-reset email, no in-process rate limit required (document with `ponytail:` if skipped).
- Keep existing UI layout/copy on `/signup` and `/login`; only change submit wiring.
- Do not delete `public.users` Auth migration in v1; new code paths use `alumni_accounts`.

## Review Focus

- Empty / whitespace email or password → 400, no session cookie.
- Duplicate signup email → 409, no second row.
- Wrong password → 401, no session; correct password → Set-Cookie present.
- Pending member hitting `/member` → pending gate, not directory content.
- Non-admin hitting `/admin` → forbidden; admin verified → queue loads.

---

### Task 1: Migration `alumni_accounts` + env template

**Files:**
- Create: `supabase/migrations/20261025_alumni_accounts.sql`
- Modify: `.env.example`
- Modify: `env.d.ts` (add typings for new env vars)

**Interfaces:**
- Consumes: none
- Produces: table `public.alumni_accounts` as in spec; env names `AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 1: Write migration SQL** creating `alumni_accounts` with columns from spec, unique index on `lower(email)` or unique on `email` after lowercasing at write time, RLS enabled with **no** policies for `anon`/`authenticated` (service role bypasses RLS).

- [ ] **Step 2: Update `.env.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=
```

- [ ] **Step 3: Extend `env.d.ts`** with optional `SUPABASE_SERVICE_ROLE_KEY` and `AUTH_SECRET`.

- [ ] **Step 4: Apply migration** in Supabase SQL Editor (or CLI if available) for project `wbsrtwfhcczfbstinenl`. Verify with `\d alumni_accounts` / Table Editor.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261025_alumni_accounts.sql .env.example env.d.ts
git commit -m "feat: add alumni_accounts table for table-based auth"
```

---

### Task 2: Password helpers + self-check

**Files:**
- Create: `lib/auth/password.ts`
- Create: `scripts/check-auth-password.mjs` (or `lib/auth/password.selfcheck.ts` run via `npx tsx`)

**Interfaces:**
- Consumes: none
- Produces:
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(plain: string, hash: string): Promise<boolean>`

- [ ] **Step 1: Write failing self-check** that imports helpers and asserts `verifyPassword('secret', await hashPassword('secret')) === true` and wrong password false.

- [ ] **Step 2: Run check — expect fail** (module missing).

Run: `node --import tsx scripts/check-auth-password.mjs` (or project-equivalent)

- [ ] **Step 3: Implement `lib/auth/password.ts`** with `bcryptjs` cost `10`.

- [ ] **Step 4: `npm install bcryptjs` + `@types/bcryptjs` (dev).**

- [ ] **Step 5: Run check — expect pass.**

- [ ] **Step 6: Commit**

```bash
git add lib/auth/password.ts scripts/check-auth-password.mjs package.json package-lock.json
git commit -m "feat: add bcrypt password helpers for alumni accounts"
```

---

### Task 3: Session cookie helpers

**Files:**
- Create: `lib/auth/session.ts`
- Create: `scripts/check-auth-session.mjs`

**Interfaces:**
- Consumes: `AUTH_SECRET` from env
- Produces:
  - `SessionPayload` type: `{ accountId: string; email: string }`
  - `COOKIE_NAME` constant e.g. `sfs_session`
  - `createSessionToken(payload: SessionPayload): Promise<string>`
  - `verifySessionToken(token: string): Promise<SessionPayload | null>`
  - `sessionCookieOptions`: httpOnly, path `/`, sameSite `lax`, secure in production, maxAge ~7 days
  - Helpers to set/clear cookie on `NextResponse` if useful

- [ ] **Step 1: Write self-check** round-trip create → verify; tampered token → null.

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement with `jose` (`SignJWT` / `jwtVerify`, HS256, secret from `AUTH_SECRET`).**

- [ ] **Step 4: `npm install jose`.**

- [ ] **Step 5: Run check — pass.** Requires `AUTH_SECRET=test-secret-at-least-32-chars-long!!` in env for the script.

- [ ] **Step 6: Commit**

```bash
git add lib/auth/session.ts scripts/check-auth-session.mjs package.json package-lock.json
git commit -m "feat: add signed JWT session cookies for alumni auth"
```

---

### Task 4: Server Supabase admin client

**Files:**
- Create: `lib/supabase-admin.ts`
- Keep: `lib/supabase.ts` (browser anon — unused by auth after later tasks)

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Produces: `createAdminClient(): SupabaseClient` throwing if service role missing

- [ ] **Step 1: Implement `createAdminClient`** using `createClient` from `@supabase/supabase-js` (not browser SSR helper).

- [ ] **Step 2: Commit**

```bash
git add lib/supabase-admin.ts
git commit -m "feat: add service-role Supabase client for server auth"
```

---

### Task 5: Auth API routes

**Files:**
- Create: `app/api/auth/signup/route.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/me/route.ts`
- Create: `scripts/check-auth-api.mjs` (optional integration; skip if no service key in CI — document manual curl checks)

**Interfaces:**
- Consumes: `hashPassword`, `verifyPassword`, session helpers, `createAdminClient`
- Produces:
  - `POST /api/auth/signup` body `{ email, password, fullName, phoneNumber }` → 201 + Set-Cookie; 409 duplicate; 400 validation
  - `POST /api/auth/login` body `{ email, password }` → 200 + Set-Cookie; 401 invalid
  - `POST /api/auth/logout` → 200 clear cookie
  - `GET /api/auth/me` → 200 `{ id, email, full_name, phone_number, role, member_status }` or 401

- [ ] **Step 1: Implement signup** — normalize email `trim().toLowerCase()`, password min length 8, insert into `alumni_accounts`, set session cookie on success.

- [ ] **Step 2: Implement login** — lookup by email, `verifyPassword`, set cookie; generic 401 message `"Invalid email or password"`.

- [ ] **Step 3: Implement logout + me** — me selects by `accountId` from cookie; never returns `password_hash`.

- [ ] **Step 4: Manual verify** (with `.env.local` filled):

```bash
curl -i -X POST http://localhost:3000/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"email":"alumni1@example.com","password":"TestPass123!","fullName":"Test Alumni","phoneNumber":"+919999999999"}'
# expect 201 and set-cookie
curl -i http://localhost:3000/api/auth/me -b 'sfs_session=...'
# expect 200 JSON without password_hash
```

Also confirm in Supabase Table Editor: one row; **Auth → Users**: no new Auth user for that email.

- [ ] **Step 5: Commit**

```bash
git add app/api/auth
git commit -m "feat: add table-based signup/login session API routes"
```

---

### Task 6: Wire signup + login pages

**Files:**
- Modify: `app/signup/page.tsx` — remove `createClient` / `signUp`; `fetch('/api/auth/signup', …)`; on ok redirect `/registration` (keep existing success UX timing if present)
- Modify: `app/login/page.tsx` — same for `/api/auth/login`

**Interfaces:**
- Consumes: Auth API from Task 5
- Produces: working UI signup/login without Supabase Auth

- [ ] **Step 1: Update signup handler** to POST JSON; map non-OK body `error` string to UI error state.

- [ ] **Step 2: Update login handler** similarly; keep redirect to `/registration` on success (existing behavior).

- [ ] **Step 3: Browser check** at http://localhost:3000/signup — create account succeeds without “email rate limit”; login works on `/login`.

- [ ] **Step 4: Commit**

```bash
git add app/signup/page.tsx app/login/page.tsx
git commit -m "feat: point signup and login UI at table-based auth API"
```

---

### Task 7: MemberGate + NavBar + admin against session

**Files:**
- Modify: `components/member-gate.tsx` — fetch `/api/auth/me`; map statuses (`signed-out`, `pending`, `rejected`, `forbidden`, `allowed`, `setup` if me fails unexpectedly)
- Modify: `components/navbar.tsx` — `/api/auth/me` for logged-in UI; logout `POST /api/auth/logout`
- Modify: `app/admin/page.tsx` — list/update `alumni_accounts` via new small API routes **or** inline server fetch patterns:
  - Prefer Create: `app/api/admin/pending/route.ts` (GET) and `app/api/admin/decide/route.ts` (POST `{ id, status }`) that require session `role===admin` && `member_status===verified`, then service-role update.

**Interfaces:**
- Consumes: `/api/auth/me`, admin APIs
- Produces: gates matching prior UX copy as closely as practical

- [ ] **Step 1: Rewrite MemberGate** off Supabase Auth.

- [ ] **Step 2: Rewrite NavBar** auth bits.

- [ ] **Step 3: Admin APIs + page** read/write `alumni_accounts` pending queue (`member_status`, `reviewed_at`).

- [ ] **Step 4: Verify** pending user sees pending on `/member`; after SQL promote to admin+verified, `/admin` works; approve another pending user.

- [ ] **Step 5: Commit**

```bash
git add components/member-gate.tsx components/navbar.tsx app/admin/page.tsx app/api/admin
git commit -m "feat: gate portal and admin on table session instead of Supabase Auth"
```

---

### Task 8: Env on Vercel + smoke + docs note

**Files:**
- Modify: `IMPLEMENTATION_NOTES.md` — short note that auth is table-based; confirm-email N/A; first admin SQL
- Local `.env.local` + Vercel project `test-sfs-alumni`: set `AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (do not commit secrets)

**Interfaces:** none new

- [ ] **Step 1: Generate `AUTH_SECRET`** (`openssl rand -base64 32`) into `.env.local` and Vercel envs (production/preview/development).

- [ ] **Step 2: Add service role key** from Supabase Settings → API to `.env.local` and Vercel.

- [ ] **Step 3: `npm run build` passes with env present.**

- [ ] **Step 4: Update IMPLEMENTATION_NOTES.md.**

- [ ] **Step 5: Commit docs only** (never `.env.local`)

```bash
git add IMPLEMENTATION_NOTES.md
git commit -m "docs: note table-based alumni auth and admin bootstrap"
```

---

## Execution handoff

After plan approval, implement with **subagent-driven-development** or **executing-plans**, task by task.

**Suggested first admin SQL** (after your signup):

```sql
update public.alumni_accounts
set role = 'admin', member_status = 'verified'
where email = 'YOUR_EMAIL_HERE';
```
