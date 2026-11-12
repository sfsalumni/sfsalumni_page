# Alumni portal Heritage hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the logged-in alumni portal as a Heritage hub — personalized Home, clearer chrome, richer People directory via table-auth search — without changing registration/payment rules.

**Architecture:** Pure helpers derive welcome first-name and a single primary next-action from registration/pass signals. `PortalShell` and Home get heritage layout (welcome → pass → next action → destination lanes → jubilee band). Directory moves to `GET /api/directory` querying `alumni_accounts` (service role + verified session), replacing broken browser RPC against legacy `users`.

**Tech Stack:** Next.js 14 App Router, TypeScript, existing CSS tokens (navy/gold), `scripts/check-*.mjs` self-checks.

**Spec:** `docs/superpowers/specs/2026-10-28-alumni-portal-heritage-hub-design.md`

## Global Constraints

- Keep SFS navy `#001628` / jubilee gold tokens; no purple/cream AI-default themes.
- Nav labels stay: Home · People · Events · Memories · My submissions (+ Admin).
- Do not change venue-pass / registration / payment business logic — only presentation and Home CTA derivation.
- Memories flyer stack behavior stays; only spacing/typography alignment.
- Directory search must not rely on browser Supabase Auth or `users`-table RPC for the live path.
- Commit only when the user explicitly asks (skip plan “Commit” steps unless told).

## Review Focus

- Member with no `batch` → welcome still shows name; no “Class of” line.
- Admin on Home → venue pass may stay hidden (existing); next-action still sensible (e.g. link to Events or Admin).
- Directory empty `q` + empty `batch` → returns up to 100 verified visible alumni (same spirit as old RPC), not an error.
- Unverified session hitting `/api/directory` → 401.
- `/submissions` must not highlight Memories nav chip.

## File map

| Path | Responsibility |
|---|---|
| `lib/portal/welcome.ts` | `firstNameFromFullName`, welcome copy helpers |
| `lib/portal/next-action.ts` | `primaryNextAction(...)` → single CTA descriptor |
| `scripts/check-portal-heritage.mjs` | Self-checks for welcome + next-action + directory filter |
| `components/portal-shell.tsx` | Chrome polish + active path rules |
| `app/member/page.tsx` | Heritage Home layout |
| `components/home-destination-lanes.tsx` | Three destination lanes UI |
| `app/api/directory/route.ts` | Verified-member directory search |
| `lib/directory/search.ts` | Pure filter/normalize for directory rows (testable) |
| `app/directory/page.tsx` | People UI + API client |
| `app/memories/page.tsx` / `app/submissions/page.tsx` | Light spacing/intro alignment only |

---

### Task 1: Welcome + next-action helpers

**Files:**
- Create: `lib/portal/welcome.ts`
- Create: `lib/portal/next-action.ts`
- Create: `scripts/check-portal-heritage.mjs`

**Interfaces:**
- Produces:
  - `firstNameFromFullName(fullName: string): string` — first token; fallback `"friend"` if empty
  - `PrimaryNextAction = { label: string; href: string; kind: 'register' | 'continue' | 'pass_ready' }`
  - `primaryNextAction(input: { hasRegistration: boolean; anyUnpaid: boolean; continueHref?: string }): PrimaryNextAction`
    - no registration → `{ kind:'register', label:'Register for an event', href:'/events' }` (or `/registration` if that is the choose-event entry — prefer `/events` per spec)
    - unpaid → `{ kind:'continue', label:'Continue registration', href: continueHref || '/events' }`
    - else → `{ kind:'pass_ready', label:'Your pass is ready', href:'#venue-pass' }`

- [ ] **Step 1: Failing checks** in `scripts/check-portal-heritage.mjs`:

```js
assert(firstNameFromFullName('Anita Rao') === 'Anita');
assert(firstNameFromFullName('  ') === 'friend');
assert(primaryNextAction({ hasRegistration: false, anyUnpaid: false }).kind === 'register');
assert(primaryNextAction({ hasRegistration: true, anyUnpaid: true, continueHref: '/registration?event=x' }).href.includes('registration'));
assert(primaryNextAction({ hasRegistration: true, anyUnpaid: false }).kind === 'pass_ready');
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --experimental-strip-types scripts/check-portal-heritage.mjs`

- [ ] **Step 3: Implement helpers**

- [ ] **Step 4: Run — expect PASS**

---

### Task 2: Directory search helper + API

**Files:**
- Create: `lib/directory/search.ts`
- Create: `app/api/directory/route.ts`
- Modify: `scripts/check-portal-heritage.mjs` (add filter cases)

**Interfaces:**
- Consumes: `getCurrentAccount`, `createAdminClient`
- Produces:
  - `DirectoryAlum = { id; full_name; batch; current_location; profession; bio }`
  - `filterDirectoryRows(rows, { q, batch }): DirectoryAlum[]` — case-insensitive match on name/location/profession; batch equality when set; preserve order; max 100
  - `GET /api/directory?q=&batch=` → 401 if not verified; else select from `alumni_accounts` where `member_status='verified'` and `profile_visibility=true` (if column missing, omit visibility filter with comment), then filter in helper or SQL `ilike`; return `{ alumni: DirectoryAlum[] }`

**Ruling if `profile_visibility` absent on `alumni_accounts`:** select without it; document in code comment. Prefer column if present in schema.

- [ ] **Step 1: Failing filter checks** — sample rows; `q=hyd` matches Hyderabad location; `batch=1999` excludes other years; empty q returns all (capped).

- [ ] **Step 2: Implement helper + route**

- [ ] **Step 3: Manual smoke** — verified cookie GET returns JSON; unverified 401.

---

### Task 3: PortalShell chrome

**Files:**
- Modify: `components/portal-shell.tsx`

**Interfaces:**
- Produces: shorter default intro; quieter inactive chips; active = exact `path === href` (plus `/admin` prefix only for Admin link); subtle background wash / gold hairline under nav

- [ ] **Step 1: Update shell styles + active logic** so `/submissions` does not activate Memories.

- [ ] **Step 2: Visual check** on `/memories` vs `/submissions`.

---

### Task 4: Heritage Home

**Files:**
- Create: `components/home-destination-lanes.tsx`
- Modify: `app/member/page.tsx`
- Modify: `components/member-venue-pass.tsx` — add `id="venue-pass"` on ready/empty section root for `#venue-pass` scroll

**Interfaces:**
- Consumes: `firstNameFromFullName`, `primaryNextAction`, `/api/auth/me`, existing pass fetch pattern (may lift minimal registration summary into Home or derive next-action from pass phase props)
- Produces: layout welcome → pass → next-action CTA → `HomeDestinationLanes` → jubilee band

**Ruling for next-action data:** Home client fetches `/api/auth/me` + reuses the same registration list approach as `MemberVenuePass` (small shared fetch helper optional). Avoid duplicating pass UI. Simplest: export a tiny hook or duplicate the lightweight “any registration / any unpaid” scan already in venue pass — prefer extracting `loadMemberPasses()` into `lib/portal/load-passes.ts` only if copy-paste exceeds ~30 lines; otherwise duplicate once with comment.

- [ ] **Step 1: Implement lanes component** — People / Events / Memories with CTA verbs.

- [ ] **Step 2: Rebuild member page** per spec order.

- [ ] **Step 3: Check** welcome + Class of when batch set; one next-action button.

---

### Task 5: People directory UI

**Files:**
- Modify: `app/directory/page.tsx`

**Interfaces:**
- Consumes: `GET /api/directory`
- Produces: search hero + richer result tiles; remove `createClient().rpc`

- [ ] **Step 1: Rewrite directory page** to call API; show initials, Class of, city, profession.

- [ ] **Step 2: Empty/error copy** per spec.

- [ ] **Step 3: Smoke** as verified member — search returns rows from `alumni_accounts`.

---

### Task 6: Memories / Submissions alignment

**Files:**
- Modify: `app/memories/page.tsx` — shorten intro if long; match section title spacing (`mb-4` / headline classes consistent with Home)
- Modify: `app/submissions/page.tsx` — same title rhythm; ensure ledger layout intact

- [ ] **Step 1: Light copy/spacing pass only** (no behavior change).

- [ ] **Step 2: Confirm** flyer stack and submissions list still work.

---

## Spec coverage

| Spec item | Task |
|---|---|
| Welcome + Class of | 1, 4 |
| Venue pass + primary next action | 1, 4 |
| Destination lanes | 4 |
| Jubilee / Association | 4 |
| PortalShell polish + nav active | 3 |
| Directory service-role API | 2, 5 |
| Richer People tiles | 5 |
| Memories/Submissions align | 6 |
| Reduced motion / tokens | Global + 3, 4 |

## Self-review notes

- Old `search_sfs_alumni` targets `users` — do **not** call it from the new API; query `alumni_accounts`.
- `#venue-pass` requires an id on the pass section.
- Admin with hidden pass: next-action should still offer Events (`register` or `pass_ready` fallback to `/events` if no passes loaded).
