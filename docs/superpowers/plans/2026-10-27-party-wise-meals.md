# Party-wise meals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-person veg/non-veg/no-food and lunch/dinner on registration, with cost and catering counts derived from a `guests` JSON array.

**Architecture:** Add `event_registrations.guests` jsonb; pure helpers normalize guests, cost per guest, and meal counts; registration form edits one row per person; register/reprice/prefill/venue/admin read `guests` with legacy fallback.

**Tech Stack:** Next.js App Router, TypeScript, Supabase SQL migration + service-role APIs, existing `scripts/check-*.mjs` self-checks (`node --experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-10-27-party-wise-meals-design.md`

## Global Constraints

- Prefer `guests` when non-empty; otherwise expand legacy `food_preference` / `lunch` / `dinner` × `number_of_guests`.
- `number_of_guests` always equals `guests.length` on write (min 1).
- `preference === 'none'` forces `lunch`/`dinner` false.
- Parking remains one choice per registration.
- Keep writing legacy summary columns (`food_preference` mixed|veg|non-veg|none, `lunch`/`dinner` any-true).
- Preserve SFS navy/gold/surface UI; no new design system.
- Commit only when the user explicitly asks (skip plan “Commit” steps unless told).

## Review Focus

- Mixed party: cost must equal sum of per-guest meals + fee×N + parking (not “everyone gets majority diet”).
- Party size shrink drops trailing guests; grow appends default `{ preference:'veg', lunch:false, dinner:false }`.
- Empty `guests` + legacy only: expand to N identical guests before costing.
- `preference:'none'` with lunch true in payload → normalized to no meals; not charged.
- Venue/admin never show a single “Veg” when preferences differ (`mixed` / counts string).

---

### Task 1: Guest types, normalize, counts, cost-from-guests

**Files:**
- Modify: `lib/registration.ts`
- Modify: `scripts/check-event-registration-cost.mjs`

**Interfaces:**
- Produces:
  - `GuestChoice = { preference: FoodPreference; lunch: boolean; dinner: boolean }`
  - `normalizeGuest(raw: unknown): GuestChoice`
  - `normalizeGuests(raw: unknown, fallbackPeople?: number): GuestChoice[]` (min length 1)
  - `guestsFromLegacy(people, preference, lunch, dinner): GuestChoice[]`
  - `legacySummaryFromGuests(guests): { food_preference: string; lunch: boolean; dinner: boolean }`
  - `guestMealCounts(guests): { lunchVeg; lunchNonVeg; dinnerVeg; dinnerNonVeg; noFood; people }`
  - `CostCalculationInput` gains `guests?: GuestChoice[]`; if present, costing uses guests; else adapter expands legacy fields via `guestsFromLegacy`
  - `getEventCostBreakdown` / `validateRegistrationCost` honor guest array
  - `formatGuestMealCounts(counts): string` compact kitchen line

- [ ] **Step 1: Failing checks** in `scripts/check-event-registration-cost.mjs`:

```js
const pricing = {
  lunch_paise: 30000,
  dinner_paise: 50000,
  lunch_nonveg_paise: 45000,
  dinner_nonveg_paise: 70000,
  parking_2w_paise: 5000,
  parking_4w_paise: 20000,
  base_ticket_paise: 10000,
};
const guests = [
  { preference: 'non-veg', lunch: true, dinner: true },
  { preference: 'veg', lunch: true, dinner: false },
  { preference: 'none', lunch: false, dinner: false },
];
// meals: 45000+70000 + 30000 + 0 = 145000; fee 3×10000=30000; parking 20000 → 195000
assert(calculateEventRegistrationCost(pricing, { guests, parkingNeeded: '4-wheeler' }) === 195000);
assert(guestMealCounts(guests).lunchVeg === 1);
assert(guestMealCounts(guests).lunchNonVeg === 1);
assert(guestMealCounts(guests).dinnerNonVeg === 1);
assert(guestMealCounts(guests).noFood === 1);
assert(legacySummaryFromGuests(guests).food_preference === 'mixed');
```

Keep existing uniform-party assertions; update any that assumed shared preference math only if they conflict (legacy adapter path should still pass old cases).

- [ ] **Step 2: Run — expect FAIL**

Run: `node --experimental-strip-types scripts/check-event-registration-cost.mjs`

- [ ] **Step 3: Implement helpers + guest-aware costing** in `lib/registration.ts`. Details string count-oriented per spec.

- [ ] **Step 4: Run — expect PASS**

---

### Task 2: Migration `guests` + expand backfill

**Files:**
- Create: `supabase/migrations/20261027_registration_guests.sql`

**Interfaces:**
- Produces: column `event_registrations.guests jsonb not null default '[]'::jsonb`; backfill one guest then expand to `number_of_guests` clones when `number_of_guests > 1`

- [ ] **Step 1: Write migration** — add column; backfill single guest from legacy; then SQL that expands array to length `greatest(number_of_guests, 1)` by repeating element 0 (use `jsonb_agg` / `generate_series` pattern).

- [ ] **Step 2: Apply** in Supabase SQL Editor for the project. Spot-check one multi-guest row: `jsonb_array_length(guests) = number_of_guests`.

---

### Task 3: Prefill / existing-registration guests

**Files:**
- Modify: `lib/events/existing-registration.ts`
- Modify: `scripts/check-existing-registration.mjs`
- Modify: `scripts/check-registration-prefill.mjs`

**Interfaces:**
- Consumes: `normalizeGuests`, `guestsFromLegacy`, `GuestChoice` from `lib/registration.ts`
- Produces: `ExistingRegistrationRow.guests?`; `RegistrationFormChoices.guests: GuestChoice[]`; `RegistrationPrefill.guests`; `registrationChoicesFromRow` / `mergeRegistrationPrefill` populate `guests`

- [ ] **Step 1: Failing check** — row with `guests: [{preference:'veg',lunch:true,dinner:false},{preference:'non-veg',lunch:false,dinner:true}]` → prefill `guests` equal; row with empty guests + legacy non-veg lunch true, `number_of_guests: 2` → two identical non-veg lunch guests.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**; keep `food_preference` / `lunch` / `dinner` on prefill as legacy summary for any leftover UI.

- [ ] **Step 4: Run — expect PASS**

---

### Task 4: Reprice + register server path

**Files:**
- Modify: `lib/events/reprice-math.ts`
- Modify: `lib/events/reprice.ts` (select `guests`)
- Modify: `lib/events/register.ts`
- Modify: `scripts/check-reprice.mjs` (add one mixed-guest case if hooks allow)

**Interfaces:**
- Consumes: `normalizeGuests`, `legacySummaryFromGuests`, guest costing
- Produces: `repriceRegistration` costs from `row.guests` (fallback legacy); `registerAccountForEvent` accepts `body.guests`, writes `guests` + summary columns + `number_of_guests = guests.length`

- [ ] **Step 1: Extend reprice check** — row with two different guests and split rates → expected total matches Task 1 formula for that subset.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Wire reprice + register**; `REG_SELECT` / reprice select include `guests`; validation error copy unchanged in spirit (meal or parking or registration fee).

- [ ] **Step 4: Run reprice + cost checks — PASS**

---

### Task 5: Venue pass counts

**Files:**
- Modify: `lib/events/venue-pass.ts`
- Modify: `scripts/check-venue-pass.mjs`
- Modify: `components/member-venue-pass.tsx` if types need `guests`

**Interfaces:**
- Consumes: `guestMealCounts`, `formatGuestMealCounts`, `normalizeGuests`
- Produces: `VenuePassInput.guests?`; `venuePassSummary` sets `meals`/`food` from counts (e.g. food line = format counts; or meals = meal lines, food = diet summary — pick: **`meals` = lunch/dinner count string, `food` = “Mixed” | “Veg” | “Non-veg” | “No food”**)

- [ ] **Step 1: Failing check** — mixed two-guest pass → `food === 'Mixed'` and meals string includes both lunch veg and lunch non-veg (exact substring from `formatGuestMealCounts`).

- [ ] **Step 2: Implement + PASS**

---

### Task 6: Registration page UI (rows)

**Files:**
- Modify: `app/registration/page.tsx`

**Interfaces:**
- Consumes: `GuestChoice`, `normalizeGuests`, `getEventCostBreakdown({ guests, parkingNeeded })`, prefill `guests`
- Produces: form state `guests: GuestChoice[]`; party size syncs array length; POST body includes `guests`

- [ ] **Step 1: Replace** global Food Preference + Meals with N rows (“You”, “Guest 2”, …): preference radios + lunch/dinner checkboxes; No food clears meals.
- [ ] **Step 2: Wire** cost preview + validate + save to use `guests`; party stepper / number input resizes `guests`.
- [ ] **Step 3: Manual smoke** on local or after deploy — party of 3 mixed choices; total matches Task 1 arithmetic for those choices.

---

### Task 7: Admin registrations + check-in counts

**Files:**
- Modify: `app/api/admin/registrations/route.ts` (select/return `guests`)
- Modify: `app/admin/registrations/inner.tsx`
- Modify: `app/api/admin/check-in/route.ts` + `app/admin/check-in/page.tsx` as needed

**Interfaces:**
- Consumes: `formatGuestMealCounts(guestMealCounts(normalizeGuests(...)))`
- Produces: compact counts under people / food column

- [ ] **Step 1: Return `guests` from admin APIs**
- [ ] **Step 2: Display counts** next to existing food/meals info
- [ ] **Step 3: Smoke** admin registrations list for a mixed registration

---

### Task 8: Deploy

**Files:** none (ops)

- [ ] **Step 1: Confirm migration applied** on production Supabase
- [ ] **Step 2: `vercel deploy --prod`** after code on `main`
- [ ] **Step 3: Hard-refresh** registration + admin; verify mixed party total and counts
