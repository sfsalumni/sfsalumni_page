# Admin workspace, events & registrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an Admin submenu (Overview / Membership / Events / Registrations), per-event pricing in `event_catalog`, and `event_registrations` with alumni register + committee Mark paid.

**Architecture:** Service-role Next.js APIs behind existing table-auth sessions; new catalog/registration tables (not Auth-linked `alumni_events`); cost math is pure and event-driven; primary-event payment status write-through keeps `jubilee_reg_status` + existing CTAs working.

**Tech Stack:** Next.js App Router, TypeScript, Supabase service role, existing `requireVerifiedAdmin` / `getCurrentAccount`, Material Symbols + current SFS tokens.

**Spec:** `docs/superpowers/specs/2026-10-25-admin-events-registrations-design.md`

## Global Constraints

- Preserve SFS navy/gold/surface tokens; no purple admin theme.
- No browser grants on `event_catalog` / `event_registrations`; service role only after session checks.
- Committee accounts never self-register for events.
- Razorpay out of scope; Mark paid/unpaid is in scope.
- Do not delete legacy `alumni_events` in v1; new UI ignores it.
- Keep `JubileeRegisterLink` labels; sync primary event status into `alumni_accounts.jubilee_reg_status`.
- Commit only when the user explicitly asks (this repo’s agent rule overrides plan “Commit” steps — stage work, skip commit unless told).

## Review Focus

- Unpublished event never appears on `/api/events` or alumni register load → 404.
- Duplicate open registration for same account+event → 409 / update-in-place, never two `pending`/`paid` rows.
- Cost: client display must match server `total_cost_paise` for same inputs + event rates.
- Non-admin hitting `/api/admin/events` → 403; guest POST register → 401.
- Mark paid on primary event sets account `jubilee_reg_status=paid` and CTAs to “My registration”.

---

### Task 1: Migration `event_catalog` + `event_registrations` + Jubilee seed

**Files:**
- Create: `supabase/migrations/20261025_event_catalog_registrations.sql`

**Interfaces:**
- Consumes: `public.alumni_accounts`
- Produces: tables `event_catalog`, `event_registrations` as in spec (`is_primary`, pricing paise columns, payment_status check)

- [ ] **Step 1: Write migration** with `event_catalog` + `event_registrations`, FKs to `alumni_accounts`, partial unique index on `event_catalog (is_primary) where is_primary`, unique open-reg constraint (partial unique on `(event_id, account_id) where payment_status in ('pending','paid')`), RLS enabled with no anon/authenticated policies.

- [ ] **Step 2: Seed Jubilee** row: title/summary for Golden Jubilee, `starts_at` sensible (e.g. 2026 reunion date if known else far future), prices lunch 30000 / dinner 50000 / 2w 5000 / 4w 20000 / base 0, `published=true`, `is_primary=true`.

- [ ] **Step 3: Apply in Supabase SQL Editor** for project `wbsrtwfhcczfbstinenl`. Verify select from `event_catalog` returns the seed.

- [ ] **Step 4: Self-check script** `scripts/check-event-catalog-schema.mjs` that uses service role to `select id,is_primary,lunch_paise from event_catalog where is_primary` and asserts one row with lunch 30000. Run and expect PASS after apply.

---

### Task 2: Event-priced cost helpers

**Files:**
- Modify: `lib/registration.ts`
- Create: `scripts/check-event-registration-cost.mjs`

**Interfaces:**
- Consumes: event pricing fields `{ lunch_paise, dinner_paise, parking_2w_paise, parking_4w_paise, base_ticket_paise }`
- Produces:
  - `calculateEventRegistrationCost(pricing, input): number` (paise)
  - `getEventCostBreakdown(pricing, input): { mealCost, parkingCost, baseCost, totalCost, details }`
  - Keep `formatCostForDisplay` / adapt `validateRegistrationCost` to accept pricing (base>0 counts as valid)

- [ ] **Step 1: Write failing check** — Jubilee rates, 1 guest, lunch+dinner, 4-wheeler → total **180000** paise; with `base_ticket_paise=10000` → **190000**.

- [ ] **Step 2: Run — expect fail** (function missing).

Run: `node scripts/check-event-registration-cost.mjs`

- [ ] **Step 3: Implement helpers** in `lib/registration.ts`; leave thin wrappers calling Jubilee defaults only if still needed temporarily, or delete hardcoded constants once Task 6 wires events.

- [ ] **Step 4: Run check — expect PASS.**

---

### Task 3: AdminShell + Overview + Membership move

**Files:**
- Create: `components/admin-shell.tsx`
- Create: `app/admin/membership/page.tsx` (move UI from current admin page)
- Modify: `app/admin/page.tsx` → Overview counts only
- Modify: `components/portal-shell.tsx` or admin pages as needed so AdminShell wraps admin routes (prefer wrapping inside each admin page or a small `app/admin/layout.tsx`)

**Interfaces:**
- Consumes: existing `/api/admin/pending`, `/api/admin/members`, decide, role
- Produces: nav links Overview `/admin`, Membership `/admin/membership`, Events `/admin/events`, Registrations `/admin/registrations`

- [ ] **Step 1: Add `app/admin/layout.tsx`** that checks admin via client `MemberGate`/`require` pattern already used, renders `AdminShell` submenu + children. Submenu items exactly as spec IA.

- [ ] **Step 2: Move membership UI** to `/admin/membership` with default tab **Pending**; Directory tab holds search/filters/advanced actions.

- [ ] **Step 3: Replace `/admin` body** with three count cards (pending members, published events, unpaid registrations). Until later APIs exist, pending can use `/api/admin/pending` length; events/regs show `—` or 0 with TODO fetch from new endpoints once Tasks 4/7 land — **prefer** adding a tiny `/api/admin/overview` GET in this task that queries counts via service role (pending accounts, published catalog, pending registrations) so Overview is real from day one.

- [ ] **Step 4: Manual smoke** — login as admin → `/admin` shows submenu; Membership Approve still works; alumni cannot open `/admin`.

---

### Task 4: Admin events API + UI

**Files:**
- Create: `app/api/admin/events/route.ts` (GET list, POST create)
- Create: `app/api/admin/events/[id]/route.ts` (GET, PATCH)
- Create: `app/admin/events/page.tsx`
- Create: `app/admin/events/new/page.tsx`
- Create: `app/admin/events/[id]/page.tsx`
- Optional shared: `components/admin-event-form.tsx`

**Interfaces:**
- Consumes: `requireVerifiedAdmin`, `event_catalog`
- Produces: JSON event shape matching catalog columns; PATCH may clear other `is_primary` when setting primary

- [ ] **Step 1: Implement GET/POST `/api/admin/events`** — 403 if not admin; POST validates title, summary, starts_at, non-negative paise ints.

- [ ] **Step 2: Implement GET/PATCH `/api/admin/events/[id]`** — unpublished/published toggle; if `is_primary=true`, unset others in same transaction/update sequence.

- [ ] **Step 3: Build list + form UI** — Details + Pricing; live preview using `getEventCostBreakdown` for fixed sample `{ numberOfGuests: 1, lunch: true, dinner: true, parkingNeeded: '4-wheeler' }`.

- [ ] **Step 4: Smoke** — create draft event, publish, confirm row in DB; edit prices.

---

### Task 5: Public events API + alumni `/events` page

**Files:**
- Create: `app/api/events/route.ts` (GET published upcoming)
- Create: `app/api/events/[id]/route.ts` (GET one if published)
- Modify: `app/events/page.tsx` — fetch `/api/events`, CTA to `/registration?event=<id>`

**Interfaces:**
- Consumes: `event_catalog` via service role
- Produces: public event DTO including pricing fields needed by registration UI

- [ ] **Step 1: GET `/api/events`** — `published=true` and `starts_at >= now()` (or include ongoing if `ends_at` set); order by `starts_at`.

- [ ] **Step 2: GET `/api/events/[id]`** — 404 if missing or not published.

- [ ] **Step 3: Rewrite `/events` page** to use the API (drop Auth-client `alumni_events` read).

- [ ] **Step 4: Smoke** — published Jubilee appears; unpublished draft does not.

---

### Task 6: Alumni registration against event

**Files:**
- Create: `app/api/registration/event/route.ts`
- Modify: `app/api/registration/jubilee/route.ts` — thin wrap: resolve primary event id, delegate
- Modify: `app/registration/page.tsx` — load event from query (default sole published / primary); cost from event; submit to `/api/registration/event`
- Create: `lib/events/primary.ts` helper `getPrimaryEventId(): Promise<string | null>`

**Interfaces:**
- Consumes: `getCurrentAccount`, `calculateEventRegistrationCost`, `event_catalog`, `event_registrations`
- Produces: upsert registration `payment_status=pending`; if event `is_primary`, set account `jubilee_reg_status=pending_payment`

- [ ] **Step 1: Implement POST `/api/registration/event`** — body `{ eventId, phone_number, number_of_guests, food_preference, parking_needed, lunch, dinner, attending }`; reject admin 400; reject if already `paid` for that event 400; server recomputes total; insert or update pending row.

- [ ] **Step 2: Wire registration page** — `?event=` required when >1 published; gate paid-on-primary unchanged; remove dependency on missing `registrations` table insert.

- [ ] **Step 3: Wrap jubilee route** to primary event for backward compatibility.

- [ ] **Step 4: Smoke** — alumni submit → `event_registrations.pending` + `jubilee_reg_status=pending_payment`; CTA “Complete payment”.

---

### Task 7: Admin registrations list + Mark paid

**Files:**
- Create: `app/api/admin/registrations/route.ts` (GET filters)
- Create: `app/api/admin/registrations/[id]/route.ts` (PATCH payment_status)
- Create: `app/admin/registrations/page.tsx`
- Modify: Overview counts if not already using these tables

**Interfaces:**
- Consumes: `requireVerifiedAdmin`, joins `event_registrations` ↔ `alumni_accounts` ↔ `event_catalog`
- Produces: list rows with name, email, event title, guests, meals, parking, total, status; PATCH syncs primary CTA

- [ ] **Step 1: GET with `event_id`, `payment_status`, `q`.**

- [ ] **Step 2: PATCH** `{ payment_status: 'paid' | 'pending' }` — if primary event, set `jubilee_reg_status` to `paid` or `pending_payment`.

- [ ] **Step 3: Build admin Registrations UI** with filters + Mark paid / Mark unpaid.

- [ ] **Step 4: Acceptance smoke** — Mark paid → `/me` shows `paid`; home CTA “My registration”; `/registration` paid gate.

---

### Task 8: End-to-end verification

**Files:** none (scripts/manual)

- [ ] **Step 1: Run** `node scripts/check-event-registration-cost.mjs` and `node scripts/check-jubilee-cta.mjs` — PASS.

- [ ] **Step 2: Walk acceptance tests 1–8** from the spec; record any failure.

- [ ] **Step 3: `graphify update .`** after code changes.

- [ ] **Step 4: Stop for user review** before any commit/PR unless user asks to commit.

---

## Execution Handoff

Plan complete. Spec coverage: Admin IA, catalog+pricing, registrations, public events, alumni register, Mark paid, CTA sync, cost math, security via service role — each has a task. Legacy `alumni_events` explicitly ignored.
