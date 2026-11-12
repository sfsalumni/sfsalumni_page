# Spec: Admin workspace, events with pricing, and registrations (option B)

**Status:** approved  

**Date:** 2026-10-25  
**Project:** SFS Alumni Golden Jubilee portal  
**Prior chat design:** approved (admin submenu + event pricing + alumni register against published events)

## Goal

Give the alumni committee an intuitive **Admin workspace** with clear submenus for membership, events (including per-event costs), and registrations. Alumni discover **published** events in the portal and register using that event’s pricing — not hardcoded Jubilee-only numbers.

## Non-goals

- Razorpay / payment gateway (follow-up); committee **Mark paid / Mark unpaid** is in scope without Razorpay
- Rebuilding the public marketing site or PortalShell visual language
- Stories / memories admin (out of scope)
- Migrating historical `pre_registrations` rows (optional later import)

## Actors

| Actor | Access | Capabilities |
|---|---|---|
| Admin (`role=admin`, `member_status=verified`) | `/admin/*` | Overview, membership queue/directory, CRUD events + pricing, list/filter registrations, optional mark paid |
| Alumni (any `member_status`) | `/events`, `/registration?event=` | View published events; submit registration → `pending_payment` (or paid later) |
| Guest | public site | See Register CTAs; must sign in to register |

Committee accounts still **do not** self-register for events (existing rule).

## Success criteria

1. Membership approval is a **submenu**, not the entire admin landing experience; pending queue is the default membership view.
2. An admin can create an event, set meal/parking (and optional base) prices, publish it, and see it on `/events`.
3. An alumnus can open Register for a published event and see a total computed from **that event’s** prices.
4. Admin can open Registrations, filter by event/status, and see who registered and for how much.
5. Existing SFS tokens (navy / gold / surface) are preserved — no new purple admin theme.

---

## Information architecture

```
/admin                 → Overview (counts + shortcuts)
/admin/membership      → Pending queue (default) + Directory tab
/admin/events          → Event list
/admin/events/new      → Create event + pricing
/admin/events/[id]     → Edit event + pricing
/admin/registrations   → Cross-event registration table
```

**Admin chrome:** shared `AdminShell` inside existing portal patterns:

- Desktop: left vertical submenu (Overview · Membership · Events · Registrations)
- Mobile: horizontal scroll chips under the page title
- Active item: filled primary chip or left border — not a second design system
- Site nav “Admin” continues to land on `/admin` (Overview)

**Membership UX**

- Default tab: **Pending** — Approve / Reject only; show name, batch, email, phone, signed-up date
- Tab **Directory**: search + status filter + Suspend / Re-verify / Make admin (current advanced actions)
- Pending empty state: “No one waiting — you’re clear”
- Overview card: pending count with link into Membership

Move current `/admin` membership UI into `/admin/membership`. Keep `/admin` as Overview so the old bookmark still works as a sensible landing page (not a broken redirect forever — Overview is the new home).

---

## Data model

### Events

Existing `public.alumni_events` is Auth/`users`-oriented and lacks pricing. Prefer a **new** table used by table-auth admins (service role), rather than fighting RLS tied to `auth.uid()`:

`public.event_catalog` (name may be `alumni_event_catalog` in migration if clearer):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | text not null | |
| `summary` | text not null | short card copy |
| `description` | text | optional long form |
| `starts_at` | timestamptz not null | |
| `ends_at` | timestamptz | optional |
| `venue` | text | |
| `published` | boolean not null default false | |
| `lunch_paise` | int not null default 0 | per person |
| `dinner_paise` | int not null default 0 | per person |
| `parking_2w_paise` | int not null default 0 | flat |
| `parking_4w_paise` | int not null default 0 | flat |
| `base_ticket_paise` | int not null default 0 | per alumnus (optional) |
| `is_primary` | boolean not null default false | at most one `true` (partial unique index); drives global Register CTAs |
| `created_by` | uuid | FK `alumni_accounts.id`, nullable |
| `created_at` | timestamptz default now() |
| `updated_at` | timestamptz default now() |

**Access:** no direct browser grants; all reads/writes via Next.js APIs + service role (same pattern as `alumni_accounts`).

Seed or admin-create the Golden Jubilee event with today’s hardcoded prices (lunch 30000, dinner 50000, 2w 5000, 4w 20000, base 0).

Legacy `alumni_events` may remain unread by the new UI in v1 (no delete required).

### Registrations

New table `public.event_registrations`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid not null FK → `event_catalog` | |
| `account_id` | uuid not null FK → `alumni_accounts` | |
| `phone_number` | text | snapshot |
| `number_of_guests` | int not null default 0 | |
| `food_preference` | text | veg / non-veg / etc. as today’s form |
| `parking_needed` | text | `none` \| `2-wheeler` \| `4-wheeler` |
| `lunch` | boolean not null | |
| `dinner` | boolean not null | |
| `attending` | boolean not null default true | |
| `total_cost_paise` | int not null | server-computed at submit |
| `payment_status` | text not null | `pending` \| `paid` \| `cancelled` |
| `created_at` | timestamptz default now() |
| `updated_at` | timestamptz default now() |

Unique constraint: **one open registration per (`event_id`, `account_id`)** where `payment_status` in (`pending`,`paid`) — prevent duplicates. Re-open after `cancelled` allowed.

### Account-level CTA status

Today `alumni_accounts.jubilee_reg_status` drives global CTAs for a single Jubilee funnel. For multi-event:

- **Source of truth** becomes `event_registrations.payment_status` for a chosen **featured / primary** event (initially the Jubilee row, or the soonest published upcoming event).
- Keep `jubilee_reg_status` in sync for the primary event in v1 (write-through on register / mark paid) so existing `JubileeRegisterLink` / login redirects keep working without a large CTA rewrite.
- Follow-up (out of scope): per-event CTAs and dropping the account column.

Mapping:

| Registration `payment_status` | Account `jubilee_reg_status` (primary event only) |
|---|---|
| none (no row) | `none` |
| `pending` | `pending_payment` |
| `paid` | `paid` |
| `cancelled` | `none` (if no other open primary reg) |

---

## Cost calculation

Move hardcoded paise in `lib/registration.ts` to a pure function:

`calculateEventRegistrationCost(eventPricing, { numberOfGuests, lunch, dinner, parkingNeeded })`

- Meals: `(1 + guests) × (lunch and/or dinner rates)`
- Parking: flat from event’s 2w/4w rates
- Base ticket: add `base_ticket_paise` once per alumnus (not per guest) when > 0
- Server recomputes and stores `total_cost_paise`; client display is advisory

Validation: at least one of lunch, dinner, parking≠none, or base>0 — same spirit as today.

---

## Server API

All admin routes: `requireVerifiedAdmin()` (existing guard).

| Route | Method | Behavior |
|---|---|---|
| `/api/admin/events` | GET | List events (all statuses for admin) |
| `/api/admin/events` | POST | Create event + pricing |
| `/api/admin/events/[id]` | GET | One event |
| `/api/admin/events/[id]` | PATCH | Update details/pricing/published |
| `/api/admin/registrations` | GET | Query `event_id`, `payment_status`, `q` |
| `/api/admin/registrations/[id]` | PATCH | Set `payment_status` to `paid` or `pending`; sync primary account CTA |
| `/api/events` | GET | Published upcoming events (alumni/guest-safe fields, including pricing for register UI) |
| `/api/events/[id]` | GET | One published event (404 if unpublished / missing) |
| `/api/registration/event` | POST | Body: eventId + form fields; create/update registration `pending`; sync CTA if primary |

Deprecate or thin-wrap `/api/registration/jubilee` to call the event registration path for the primary Jubilee event id (env or DB flag).

Membership APIs (`pending`, `members`, `decide`, `role`) unchanged; only UI location moves.

---

## UI surfaces

### Admin Overview (`/admin`)

Three count cards → deep links: Pending memberships · Published events · Unpaid registrations. Short “How to use” is unnecessary; cards are enough.

### Admin Membership (`/admin/membership`)

As in Information architecture. Port existing decide/role logic; improve default to Pending.

### Admin Events

- List: title, starts_at, published badge, registration count, Edit
- Editor: Details + Pricing sections; live cost preview for sample “1 guest, lunch+dinner, 4-wheeler”
- Publish toggle with confirm copy: “Visible on Alumni Events and open for registration”

### Admin Registrations

- Filters: event select, payment status, search
- Columns: name, email, event, guests, lunch/dinner, parking, total (₹), status, submitted
- Row actions: Mark paid / Mark unpaid (committee testing before Razorpay)

### Alumni Events (`/events`)

- Load via `/api/events` (service role), not broken Auth RLS client read
- Card CTA → `/registration?event=<id>`

### Alumni Registration (`/registration`)

- Require `event` query param when multiple published events exist; if exactly one published upcoming, default to it
- Prefill/gate rules unchanged (admin blocked; paid-on-primary blocked)
- On submit: POST `/api/registration/event` (authoritative); stop relying on missing `registrations` table
- Show cost from loaded event pricing

### CTAs

Keep `JubileeRegisterLink` behavior for the primary event; labels unchanged (`Register` / `Complete payment` / `My registration`).

---

## Visual language

- Reuse `PortalShell` / admin pages’ existing typography and colors
- Admin submenu uses Material Symbols already in the project (e.g. `group`, `event`, `confirmation_number`, `dashboard`)
- Tables: `overflow-x-auto`; pending queue accent with existing gold token strip
- No new card-heavy dashboard chrome in the marketing hero sense — admin is operational density

---

## Security

- All catalog/registration mutations server-side with service role after session checks
- Admins cannot mark another admin’s membership incorrectly — existing decide/role rules remain
- Alumni can only create/update **their own** registration rows
- Unpublished events never returned from public `/api/events`
- Do not expose other registrants’ PII on alumni routes

---

## Migration / rollout

1. Add `event_catalog` + `event_registrations` migrations; apply in Supabase SQL Editor (same hobby ops as before)
2. Seed Jubilee event with current prices and `is_primary = true`
3. Ship AdminShell + membership move
4. Ship events CRUD + alumni list/register wire-up
5. Ship registrations admin list (+ optional mark paid)

---

## Acceptance tests

1. Admin opens `/admin` → sees Overview counts; submenu navigates to Membership / Events / Registrations.
2. Pending membership Approve/Reject still works from `/admin/membership`.
3. Admin creates event with lunch ₹300 / dinner ₹500 / parking rates, publishes → appears on `/events`.
4. Alumni opens Register → total matches `(people×meals)+parking(+base)` for that event.
5. Submit creates `event_registrations` row `payment_status=pending` and primary account `jubilee_reg_status=pending_payment`.
6. Admin Registrations lists that row; Mark paid sets `paid` and syncs account CTA to `paid`.
7. Admin visiting `/registration` still sees committee gate.
8. Guest still sees Register CTA; admin sees none.

## Out of scope follow-ups

- Razorpay orders/webhooks
- Per-event CTA chips when multiple concurrent paid events exist
- CSV export of registrations
- Editing registration meal choices after payment

## Approval

Please review this file and reply **approve** (or list changes). After spec approval, the next artifact is the implementation plan under `docs/superpowers/plans/` — still no product code until that plan’s execution method is chosen.
