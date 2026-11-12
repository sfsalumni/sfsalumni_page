# Alumni portal clarity + moderated memories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify portal IA (Home · People · Events · Memories) and ship members-only moderated memories with Supabase Storage files, DB path refs, own-batch-first browse, and auto-moving photo cards.

**Architecture:** Service-role APIs under table-auth (`getCurrentAccount` / `requireVerifiedAdmin`) own all reads/writes. Images go to private bucket `alumni-memories` under `batch/{year}/` or `general/`; `alumni_memories` stores metadata + `storage_path` + `batch_year`. `GET /api/memories` partitions published rows into `{ ownBatch, allSfs }`. UI uses horizontal auto-advance strips; admin reviews via `/admin/memories`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase Storage + Postgres (service role), existing session cookie auth, `scripts/check-*.mjs` self-checks (`node --experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-10-27-alumni-portal-memories-design.md`

## Global Constraints

- Members-only Memories; guests never see published archive without MemberGate.
- Binaries only in Storage; never in Postgres.
- Browse partition **B**: matching `batch_year` → `ownBatch` only; all other published → `allSfs` (no duplicates).
- Object paths: `batch/{year}/{uuid}.{ext}` or `general/{uuid}.{ext}` in bucket `alumni-memories`.
- Auto-move pauses on hover/focus/touch and when `prefers-reduced-motion: reduce`.
- Preserve SFS navy / gold / surface; no new purple/cream theme.
- Use `createAdminClient()` + session helpers; do not rely on Auth RLS for app writes.
- Commit only when the user explicitly asks (skip plan “Commit” steps unless told).

## Review Focus

- Member with `batch: null` → `ownBatch` empty; all published rows in `allSfs`.
- Pending row never appears in `GET /api/memories` even if Storage upload succeeded.
- Consent false / missing file / >5 MB / bad mime → 400; no orphan insert without successful upload (upload first, then insert; on insert fail best-effort delete object).
- Own-batch id must not also appear in `allSfs`.
- Signed URL refresh: list endpoint attaches display URLs; broken `storage_path` yields null image, not 500.

## File map

| Path | Responsibility |
|---|---|
| `supabase/migrations/20261028_alumni_memories_storage.sql` | `batch_year`, `review_note`, FK → `alumni_accounts`, bucket |
| `lib/memories/types.ts` | Shared memory DTOs |
| `lib/memories/paths.ts` | `memoryObjectPath(batchYear, id, ext)` |
| `lib/memories/partition.ts` | `partitionPublishedMemories(rows, memberBatch)` |
| `lib/memories/validate.ts` | Upload field validation helpers |
| `scripts/check-memories-partition.mjs` | Partition + path self-check |
| `app/api/memories/route.ts` | GET published partitioned; POST multipart |
| `app/api/memories/mine/route.ts` | GET own submissions |
| `app/api/admin/memories/route.ts` | GET queue by status |
| `app/api/admin/memories/[id]/route.ts` | PATCH approve/reject |
| `components/portal-shell.tsx` | Nav labels/links |
| `components/admin-shell.tsx` | Memories admin link |
| `components/memory-photo-strip.tsx` | Auto-moving photo cards |
| `app/memories/page.tsx` | Browse + share + mine |
| `app/member/page.tsx` | CTA copy + Association link |
| `app/admin/memories/page.tsx` | Review UI |
| `app/admin/page.tsx` | Optional pending-memories overview card |

---

### Task 1: Pure helpers — paths + partition

**Files:**
- Create: `lib/memories/types.ts`
- Create: `lib/memories/paths.ts`
- Create: `lib/memories/partition.ts`
- Create: `scripts/check-memories-partition.mjs`

**Interfaces:**
- Produces:
  - `MemoryStatus = 'pending' | 'published' | 'rejected'`
  - `PublishedMemory = { id: string; title: string; description: string | null; image_url: string | null; storage_path: string | null; batch_year: number | null; batch_label: string | null; created_at: string }`
  - `memoryObjectPath(batchYear: number | null, objectId: string, ext: string): string` → `batch/1999/{id}.jpg` or `general/{id}.jpg` (ext without leading dot; lowercase)
  - `partitionPublishedMemories<T extends { id: string; batch_year: number | null }>(rows: T[], memberBatch: number | null): { ownBatch: T[]; allSfs: T[] }` — if `memberBatch` is null/NaN, `ownBatch=[]` and `allSfs=rows`; else own = `batch_year === memberBatch`, allSfs = rest; preserve input order within each list

- [ ] **Step 1: Failing check** in `scripts/check-memories-partition.mjs`:

```js
import { memoryObjectPath } from '../lib/memories/paths.ts';
import { partitionPublishedMemories } from '../lib/memories/partition.ts';

assert(memoryObjectPath(1999, 'abc', 'JPG') === 'batch/1999/abc.jpg');
assert(memoryObjectPath(null, 'abc', 'png') === 'general/abc.png');

const rows = [
  { id: '1', batch_year: 1999 },
  { id: '2', batch_year: 2001 },
  { id: '3', batch_year: null },
  { id: '4', batch_year: 1999 },
];
const p = partitionPublishedMemories(rows, 1999);
assert(p.ownBatch.map((r) => r.id).join() === '1,4');
assert(p.allSfs.map((r) => r.id).join() === '2,3');
const none = partitionPublishedMemories(rows, null);
assert(none.ownBatch.length === 0 && none.allSfs.length === 4);
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --experimental-strip-types scripts/check-memories-partition.mjs`

- [ ] **Step 3: Implement** `paths.ts` + `partition.ts` (+ minimal types)

- [ ] **Step 4: Run — expect PASS**

---

### Task 2: Migration — memories columns + Storage bucket

**Files:**
- Create: `supabase/migrations/20261028_alumni_memories_storage.sql`

**Interfaces:**
- Produces: `alumni_memories.batch_year int null`, `review_note text null`; `submitted_by` / `reviewed_by` reference `alumni_accounts(id)` (drop old FKs to `users` if present); index on `(status, batch_year, created_at desc)`; insert private storage bucket `alumni-memories` if missing; revoke anon/authenticated table grants if not already (service role only for app path)

- [ ] **Step 1: Write migration** — additive columns; safe FK swap (`alter table … drop constraint` if exists, then add FK to `alumni_accounts`); bucket:

```sql
insert into storage.buckets (id, name, public)
values ('alumni-memories', 'alumni-memories', false)
on conflict (id) do nothing;
```

No public storage policies for anon upload; app uses service role.

- [ ] **Step 2: Apply** in Supabase SQL Editor. Confirm columns + bucket exist.

---

### Task 3: Validate helpers + member APIs

**Files:**
- Create: `lib/memories/validate.ts`
- Create: `app/api/memories/route.ts`
- Create: `app/api/memories/mine/route.ts`
- Modify: `scripts/check-memories-partition.mjs` (or create `scripts/check-memories-validate.mjs`) for mime/size/consent assertions if pure

**Interfaces:**
- Consumes: `getCurrentAccount`, `createAdminClient`, `memoryObjectPath`, `partitionPublishedMemories`
- Produces:
  - `assertMemoryUpload({ title, consent, batchYearRaw, file }): { title; description; batchYear: number | null; ext }` — throws/`{ error }` for: empty title; consent not true; missing file; size > 5_000_000; mime not in `image/jpeg|image/png|image/webp`
  - `GET /api/memories` → 401 if no account or not verified; else select `status=published` order `created_at desc`, sign URLs (~1h) from `storage_path`, return `{ ownBatch, allSfs }` using `me.batch`
  - `POST /api/memories` multipart fields: `title`, `description?`, `batch_year?` (`''`/`general` → null; default `me.batch` when omitted), `consent` (`'true'`), `image` file → upload → insert `pending` with `submitted_by=me.id`, `consent_confirmed=true`
  - `GET /api/memories/mine` → own rows all statuses, newest first (signed URLs optional)

- [ ] **Step 1: Pure validate checks** — consent false → error; 6MB → error; `image/gif` → error; ok jpeg + title + consent → `{ ext: 'jpg', batchYear }` as expected.

- [ ] **Step 2: Implement validate + routes.** On GET, if `storage_path` set, `createSignedUrl`; set `image_url` on response DTO (do not require writing back to DB).

- [ ] **Step 3: Manual smoke** (optional if no test DB): verified session GET returns shape; POST without consent 400.

---

### Task 4: Admin memories APIs

**Files:**
- Create: `app/api/admin/memories/route.ts`
- Create: `app/api/admin/memories/[id]/route.ts`

**Interfaces:**
- Consumes: `requireVerifiedAdmin`, `createAdminClient`
- Produces:
  - `GET /api/admin/memories?status=pending|published|rejected` (default `pending`) — rows with submitter `full_name` join/lookup; signed thumb URLs
  - `PATCH /api/admin/memories/[id]` body `{ status: 'published' | 'rejected', review_note?: string }` — sets `reviewed_by`, `reviewed_at`; 403 if not admin; 400 if bad status

- [ ] **Step 1: Implement both routes** mirroring `admin/decide` auth pattern.

- [ ] **Step 2: Smoke** — non-admin 403; approve flips status so member GET includes it in the right partition.

---

### Task 5: Portal nav + Home CTAs

**Files:**
- Modify: `components/portal-shell.tsx`
- Modify: `app/member/page.tsx`

**Interfaces:**
- Produces: `baseLinks` = `/member` Home · `/directory` People · `/events` Events · `/memories` Memories (+ Admin). Remove Stories + Association from primary chips.
- Home cards: **Find people** → `/directory`; **Events** → `/events`; **Share a memory** → `/memories#share`; link text is the action name (not “Explore ↗”).
- Jubilee banner includes text link to `/about-association`.

- [ ] **Step 1: Update portal-shell links/labels.**

- [ ] **Step 2: Update member page cards + Association link.**

- [ ] **Step 3: Visual check** — chip row has no Stories/Association.

---

### Task 6: Memories page — strips, share, mine

**Files:**
- Create: `components/memory-photo-strip.tsx`
- Modify: `app/memories/page.tsx`

**Interfaces:**
- Consumes: `/api/memories`, `/api/memories/mine`, `POST /api/memories`
- Produces:
  - `MemoryPhotoStrip({ items, label, emptyText })` — horizontal cards; auto-advance every 4500ms if `items.length > 1`; pause on pointer enter / focus-within; `matchMedia('(prefers-reduced-motion: reduce)')` disables auto-advance; prev/next buttons
  - Page sections: Your batch strip → All SFS strip → `#share` form → My submissions list
  - Form: file, title, description, batch select (default member batch from `/api/auth/me`, option “General / all SFS”), consent checkbox
  - Stop using browser `createClient().from('alumni_memories')`

- [ ] **Step 1: Implement `MemoryPhotoStrip`.**

- [ ] **Step 2: Rewrite memories page** behind `MemberGate` + `PortalShell`.

- [ ] **Step 3: Check** reduced-motion path does not interval-advance; share without consent blocked client + server.

---

### Task 7: Admin Memories UI

**Files:**
- Modify: `components/admin-shell.tsx`
- Create: `app/admin/memories/page.tsx`
- Modify: `app/admin/page.tsx` (optional card: pending memory count via overview or separate fetch)

**Interfaces:**
- Produces: AdminShell link `{ href: '/admin/memories', label: 'Memories', icon: 'photo_library', match: 'prefix' }`
- Page: tabs Pending | Published | Rejected; card with thumb, title, caption, submitter, batch, date; Approve / Reject (reject optional note → PATCH)

- [ ] **Step 1: Add nav link + page.**

- [ ] **Step 2: Wire Approve/Reject to PATCH; refresh list.**

- [ ] **Step 3: Confirm** approved item appears in member browse partition.

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Portal nav Home · People · Events · Memories | 5 |
| Association secondary; Stories off primary nav | 5 |
| Home CTAs + Association link | 5 |
| Members-only + published-only browse | 3, 6 |
| Storage + DB `storage_path` | 2, 3 |
| Paths by batch / general | 1, 3 |
| Own batch then All SFS (B) | 1, 3, 6 |
| Auto-moving photo cards + reduced motion | 6 |
| Share → pending + consent | 3, 6 |
| My submissions | 3, 6 |
| Admin approve/reject + UI | 4, 7 |
| Visual language preserved | Global + UI tasks |

## Self-review notes

- `batch` on `alumni_accounts` is the member’s year; memories use `batch_year` (nullable).
- FK swap may fail if legacy `users`-referenced rows exist — migration should null orphan FKs or drop constraint first then add.
- Bucket insert requires Storage schema privileges in Supabase; if SQL fails, create bucket in Dashboard and keep table migration.
