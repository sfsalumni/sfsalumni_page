# Spec: Alumni portal clarity + moderated memories

**Status:** approved  

**Date:** 2026-10-28  
**Project:** SFS Alumni Golden Jubilee portal  
**Prior chat design:** approved (whole-portal pass C; members-only Memories; admin approval before publish; simplify nav + Home actions; Storage + DB refs; own-batch-first then All SFS; auto-moving photo cards)

## Goal

Make the alumni portal easier to understand at a glance, and let verified members contribute photos/memories that only appear after committee approval — files in Supabase Storage, metadata + path refs in Postgres, browsed with the member’s own batch first.

## Non-goals

- Public (guest) browsing of Memories
- Redesigning the marketing homepage or Admin chrome beyond a Memories review submenu
- Full Stories CMS rewrite (Stories keep the same Storage + batch path pattern when revisited; not in v1 UI)
- Video uploads, albums, comments, or social reactions in v1
- Changing event registration / payment flows
- Storing image blobs in the database

## Actors

| Actor | Capabilities |
|---|---|
| Guest | Cannot open Memories or Directory content behind MemberGate; can still use public marketing + login/signup |
| Verified member | Portal nav; Home hub; browse published memories (own batch first → All SFS); submit memory (pending); see own submission statuses |
| Pending / rejected / suspended member | MemberGate rules unchanged |
| Admin | `/admin/memories` queue: Approve / Reject pending submissions; portal Admin link unchanged |

## Success criteria

1. Portal primary nav is short and task-named: **Home · People · Events · Memories** (+ Admin when applicable). Association is secondary, not a peer tab.
2. Home leads with venue pass / registration, then three clear CTAs (Find people, Events, Share a memory).
3. Memories is **members-only**; published views only show `status=published`.
4. Images live in **Supabase Storage**; DB rows hold `storage_path` (+ display URL) and batch metadata — never the binary.
5. Member can upload image + title (+ optional caption/batch) with consent; row starts as `pending` and never appears in published views until approved.
6. Published browse order: **Your batch** first, then **All SFS** (other years + untagged) in one section.
7. Published memories use **photo cards with intuitive auto-move** (auto-advance strip; pause on hover/focus; respect `prefers-reduced-motion`).
8. Admin can approve/reject pending items; approve sets `published` and reviewer metadata; reject sets `rejected`.
9. Member can see **My submissions** (pending / rejected / published) so they are not left guessing.
10. Visual language stays SFS navy / gold / surface (no new blue/purple theme).

---

## Information architecture

### Portal nav (`PortalShell`)

| Label | Route | Notes |
|---|---|---|
| Home | `/member` | Hub |
| People | `/directory` | Rename from “Alumni directory” |
| Events | `/events` | Unchanged |
| Memories | `/memories` | Members only |
| Admin | `/admin` | Admins only |

**Association** (`/about-association`): remove from primary chip row; link from Home footer or page intro “About the association”.

**Stories** (`/stories`): keep route for now; remove from primary nav (discoverable later or from Memories intro). Avoid two competing “content” tabs.

### Admin nav

Add **Memories** under AdminShell alongside Membership / Events / Registrations.

---

## Home (`/member`)

Order:

1. Existing `MemberVenuePass` (registration / venue pass).
2. Action cards (same destinations, clearer verbs):
   - **Find people** → `/directory`
   - **Events** → `/events`
   - **Share a memory** → `/memories#share` (or opens share panel)
3. Optional: “Your memory submissions” — up to 3 recent own rows with status chips.
4. Jubilee banner can stay, shortened; include link to Association.

Copy: replace vague “Explore ↗” with the action name.

---

## Memories (members only)

### Browse (option B)

- `MemberGate` required.
- Load published memories via **service-role API** (table-auth), not browser Supabase Auth RLS against old `users` policies.
- Two sections, same page:
  1. **Your batch** — published rows where `batch_year` equals the member’s batch year (from `alumni_accounts` / profile). Empty state if none: “No memories from your batch yet — be the first.”
  2. **All SFS** — every other published row (other batches + untagged/`general`). Own-batch items are **not** duplicated here.
- Within each section: newest-first (or `created_at` desc).

### Photo cards + auto-move

- Horizontal **photo card strip** for each section (image-forward cards: photo, title, optional batch chip).
- **Auto-advance** ~4–5s when the strip has more than one card; pause on hover, focus, or touch; stop when `prefers-reduced-motion: reduce`.
- Manual swipe / prev-next still available.
- Optional denser grid below the strips if the list is long (same section filters); strips are the primary “intuitive” surface.

### Share a memory

Fields:

- Image (required) — jpeg/png/webp; reasonable size cap (e.g. 5 MB)
- Title (required)
- Description / caption (optional)
- Batch year (optional; default to member’s own batch; allow “General / all SFS” for untagged)
- Consent checkbox (required) — “I have the right to share this and agree the committee may publish it”

On submit: upload object to Storage under the path below → insert row with `status=pending`, `submitted_by` = alumni account id, `consent_confirmed=true`, `storage_path` set, `image_url` optional until signed URL refresh.

### My submissions

List own rows with status: Pending · Published · Rejected. Rejected may show a short admin note if we store one (optional `review_note` column).

---

## Data & storage

### Architecture

| Layer | Role |
|---|---|
| **Supabase Storage** | Binary files only (`alumni-memories` bucket; Stories later use `alumni-stories` with the same path shape) |
| **Postgres `alumni_memories`** | Metadata + `storage_path` reference + moderation status |

Approve/reject flips DB status only; object path stays put unless we later delete orphans.

### Object paths (by batch)

```
alumni-memories/
  batch/{year}/{uuid}.{ext}   # e.g. batch/1999/…
  general/{uuid}.{ext}        # untagged / school-wide
```

Stories (follow-up, same pattern): `alumni-stories/batch/{year}/…` and `alumni-stories/general/…`.

### Table

Prefer evolving `public.alumni_memories`:

| Change | Why |
|---|---|
| `submitted_by` → FK `alumni_accounts(id)` (or parallel column if migration safer) | Match table-auth |
| Keep `status` in (`pending`,`published`,`rejected`) | Already correct |
| Keep `image_url`, `storage_path`, `title`, `description`, `consent_confirmed` | Display + Storage ref |
| Add `batch_year int null` (keep `batch_label` as optional display text if useful) | Filter own-batch vs All SFS; null ⇒ general |
| `reviewed_by` → `alumni_accounts`; `reviewed_at` | Committee audit |
| Optional `review_note text` | Reject reason for member |

RLS that depends on `auth.uid()` / `public.users` is **not** the write path for the app. App uses session cookie + service role APIs (same as events/registrations). Optionally tighten RLS to deny anon/authenticated direct writes.

### Storage access

- Bucket private preferred; APIs mint **signed URLs** for display (or public read-only after publish — pick one in implementation; default signed).
- Upload only through authenticated member API (service role upload).
- On reject/delete, optional object cleanup (nice-to-have; not blocking).

---

## APIs

| Endpoint | Who | Behavior |
|---|---|---|
| `GET /api/memories` | Verified member | Published list, partitioned: `{ ownBatch: [], allSfs: [] }` using session member’s batch year |
| `GET /api/memories/mine` | Verified member | Own submissions |
| `POST /api/memories` | Verified member | Multipart → Storage path by batch/general → insert `pending` |
| `GET /api/admin/memories?status=` | Admin | Queue |
| `PATCH /api/admin/memories/[id]` | Admin | `{ status: 'published' \| 'rejected', review_note? }` |

Committee accounts do not need to submit memories for v1 (optional allow).

---

## Admin Memories UI

`/admin/memories`:

- Tabs: Pending (default) · Published · Rejected
- Row/card: thumbnail, title, caption, submitter name, batch, date
- Actions: Approve · Reject (reject may prompt for optional note)

---

## Display & intuition principles (whole portal)

- One primary action per section.
- Labels are verbs or nouns people already use (People, not “Alumni directory”).
- Empty states tell the next step (“No published memories yet — share one for the committee to review”).
- Pending never looks “live” in published strips/grids.
- Motion supports browsing (auto-move cards); never competes with reading forms or admin tables.

---

## Testing

- Member cannot list pending of others; published-only in browse responses.
- `GET /api/memories` places matching `batch_year` only in `ownBatch`; those ids do not appear in `allSfs`.
- Submit without consent → 400.
- Submit with batch year → object under `batch/{year}/…`; without → `general/…`; DB `storage_path` matches.
- Approve → appears in published browse; reject → does not.
- Guest hitting Memories → gated to login.
- Auto-move pauses under `prefers-reduced-motion`.
- Nav snapshot: Stories/Association not in primary chip row.

## Out of scope follow-ups

- Fold Stories fully into Memories (reuse Storage + batch path pattern)
- Public marketing gallery of selected memories
- Bulk admin import of archive photos
