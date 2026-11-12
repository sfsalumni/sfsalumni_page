# Spec: Alumni portal Heritage hub

**Status:** approved  

**Date:** 2026-10-28  
**Project:** SFS Alumni Golden Jubilee portal  
**Prior chat design:** approved (scheme #2 Heritage hub; whole logged-in portal: Home + People + Memories chrome)

## Goal

Make the logged-in alumni portal feel like an SFS homecoming hub — personal greeting, clear next step, school heritage — instead of a flat grid of equal grey cards.

## Non-goals

- Marketing homepage redesign
- Admin chrome redesign (beyond existing Admin chip)
- New product surfaces (jobs, mentoring, donations widgets)
- Changing registration / payment / venue-pass business rules
- Replacing Memories flyer stack behavior (keep; only align typography/spacing)
- Purple / cream “AI default” visual themes; keep existing SFS navy / jubilee gold tokens

## Actors

| Actor | Experience |
|---|---|
| Verified member | Personalized Home; People search; Memories + Submissions with coherent chrome |
| Pending / other gate states | Unchanged MemberGate behavior |
| Admin | Same portal + Admin chip; no Admin layout restyle in this pass |

## Success criteria

1. Home shows **Welcome, {name}** and **Class of {batch}** when known.
2. Home order: welcome → venue pass → **one** primary next-action → three destination lanes → jubilee/association band.
3. Destination lanes are not equal mini-cards; each has one purpose, one sentence, one CTA verb.
4. PortalShell intros are short (≤1 supporting line); content starts sooner.
5. People directory uses a **service-role search API** (table-auth), not browser Supabase Auth RPC against legacy policies.
6. People results read as richer profiles (initials, gold batch line, city/profession).
7. Visual language stays SFS navy `#001628` / jubilee gold; motion respects `prefers-reduced-motion`.
8. Nav remains: Home · People · Events · Memories · My submissions (+ Admin).

---

## Information architecture

Unchanged routes:

| Label | Route |
|---|---|
| Home | `/member` |
| People | `/directory` |
| Events | `/events` |
| Memories | `/memories` |
| My submissions | `/submissions` |
| Admin | `/admin` (admins) |

Association stays secondary (Home jubilee band link to `/about-association`).

---

## Portal chrome (`PortalShell`)

- Header: eyebrow + title; intro optional / single short line.
- Nav chips: quieter inactive state; active = navy fill.
- Background: subtle navy wash or soft gold hairline under nav (not flat single grey; not loud pattern).
- Active matching: exact path for Home/Memories/Submissions (no false “Memories” active on other routes).

---

## Home (`/member`)

### Data

Client fetch `/api/auth/me` for `full_name`, `batch` (and existing registration signals already used by `MemberVenuePass`).

### Layout order

1. **Welcome band** — “Welcome, {firstName}” + optional “Class of {batch}”.
2. **Venue pass** — existing `MemberVenuePass` (primary physical/digital pass).
3. **Primary next action** (one CTA only), derived:
   - Has unpaid / incomplete registration → continue registration for that event.
   - Paid / pass ready → “Your pass is ready” (scroll/focus pass or calm confirmation).
   - No registration → “Register for an event” → `/events` or choose-event flow.
4. **Destination lanes** (full-width or large split — not three equal cards):
   - People → `/directory` — “Find classmates by batch, city, profession.”
   - Events → `/events` — “Reunions and school celebrations.”
   - Memories → `/memories#share` or `/memories` — “Share a photo for the archive.”
5. **Jubilee band** — “Once SFS, always SFS.” + Association link.

### Copy

Replace vague “Explore ↗” with the action name already used as the lane title/CTA.

---

## People (`/directory`)

### Browse / search

- MemberGate required.
- **API:** `GET /api/directory?q=&batch=` — verified member session; service role runs search (reuse or wrap existing `search_sfs_alumni` RPC / equivalent query server-side).
- Stop using browser `createClient().rpc('search_sfs_alumni')` for the live path.

### UI

- Search as page hero: name/city/profession + batch filter + Search.
- Result tiles: initials avatar, name, gold “Class of {year}”, city, profession; bio truncated if long.
- Empty: “No alumni found — try another name or batch.”
- Error: migration/config message only if API returns 503/not ready.

---

## Memories + Submissions

- Keep flyer-stack Memories + share form; align section title spacing with Home.
- After successful share, keep link to `/submissions`.
- Submissions page: status ledger (thumb, status chip, title, batch, date, reject note); empty → CTA to `/memories#share`.

---

## APIs

| Endpoint | Who | Behavior |
|---|---|---|
| `GET /api/auth/me` | Session | Already exists; Home uses name/batch |
| `GET /api/directory?q=&batch=` | Verified member | Search results array; 401 if not verified |

No change required to memories APIs for this pass.

---

## Visual & motion

- Tokens: existing CSS variables (`primary`, `jubilee-gold-*`, `surface`).
- Lane hover: soft lift or gold underline, 150–250ms.
- Focus-visible on nav and CTAs.
- `prefers-reduced-motion: reduce` → no lane motion; Memories flyer already pauses.

---

## Testing

- Home shows welcome name when signed in; Class of line when `batch` set.
- Exactly one primary next-action CTA visible in the next-action slot.
- Directory search works while logged in as verified member without browser Auth session.
- Guest / unverified still gated by MemberGate.
- Nav snapshot includes My submissions; Memories not highlighted on `/submissions`.
- Reduced-motion: no continuous decorative motion on Home lanes.

## Out of scope follow-ups

- Personalized “batch mates” widget
- Public marketing gallery
- Directory contact reveal / messaging
