# Spec: Party-wise veg / non-veg / meals

**Status:** approved  


**Date:** 2026-10-27  
**Project:** SFS Alumni Golden Jubilee portal  
**Prior chat design:** approved (store guest list JSON; UI one row per person; cost = sum of rows; catering counts derived)

## Goal

Let each person in a registration party choose **Veg / Non-veg / No food** and **Lunch / Dinner** independently. Charge meals and registration fee from those choices. Surface **kitchen-friendly counts** to admin and venue pass (not only a single shared preference).

## Non-goals

- Collecting guest names or ages
- Changing event meal price fields (veg/non-veg lunch/dinner rates stay as today)
- Changing parking (still one choice per registration)
- Splitting payment per guest
- Reworking Razorpay flows beyond using the new total

## Actors

| Actor | Change |
|---|---|
| Alumni | Registration form shows one row per person; live total follows those rows |
| Admin | Registrations / check-in / venue-facing summary show meal **counts** |
| Kitchen / venue | Counts such as “Lunch veg 2 · Lunch non-veg 1 · Dinner veg 3 · No food 1” |

## Success criteria

1. Party of 3 can mix diets and meals (e.g. Person 1 non-veg lunch+dinner, Person 2 veg lunch only, Person 3 no food) and the **rupee total matches** the sum of those choices + parking + registration fee × people.
2. Changing party size adds/removes rows; new rows default sensibly; shrinking drops trailing guests.
3. Existing registrations migrate into a one-guest list from today’s `food_preference` / `lunch` / `dinner` without changing paid amounts incorrectly on deploy (reprice only when choices or catalog rates change under the new rules).
4. Admin and venue pass show **derived counts**, not a misleading single “Veg” for a mixed party.
5. Validation still requires something billable: at least one meal across the party, or parking, or a registration fee on the event.

---

## Data model

### New column

`public.event_registrations.guests` — `jsonb not null default '[]'::jsonb`

Each element:

```json
{ "preference": "veg" | "non-veg" | "none", "lunch": boolean, "dinner": boolean }
```

Rules:

- `preference === "none"` ⇒ `lunch` and `dinner` must be `false` (normalize on write).
- Array length is the party size (including the alumnus). Minimum length **1**.
- `number_of_guests` remains and **must equal** `guests.length` on every write (keeps indexes / admin filters / party stepper working).

### Legacy columns (transition)

Keep `food_preference`, `lunch`, `dinner` for one release:

| Column | Write policy after cutover |
|---|---|
| `food_preference` | Summary: `"mixed"` if more than one distinct preference among eating guests; else that preference; `"none"` if everyone is no-food |
| `lunch` | `true` if any guest has `lunch` |
| `dinner` | `true` if any guest has `dinner` |

Reads prefer `guests` when non-empty; otherwise build a single guest from legacy columns (backward compatible).

### Migration

1. Add `guests jsonb not null default '[]'`.
2. Backfill:

```sql
update event_registrations
set guests = jsonb_build_array(
  jsonb_build_object(
    'preference', case
      when food_preference = 'non-veg' then 'non-veg'
      when food_preference = 'none' then 'none'
      else 'veg'
    end,
    'lunch', lunch,
    'dinner', dinner
  )
)
where guests = '[]'::jsonb or guests is null;
```

3. For rows with `number_of_guests > 1`, expand to N identical guests cloned from that one object (preserves prior “whole party same choice” semantics and prior totals under old math). Then apply new cost math on next reprice / save.

---

## Costing

Replace uniform “everyone same meals” with **per-guest** sum:

For each guest:

- Registration fee: `base_ticket_paise` (always, per person)
- If `preference !== 'none'` and `lunch`: add lunch rate for that preference
- If `preference !== 'none'` and `dinner`: add dinner rate for that preference

Then add parking once from `parking_needed`.

**API shape (lib):**

```ts
type GuestChoice = {
  preference: 'veg' | 'non-veg' | 'none';
  lunch: boolean;
  dinner: boolean;
};

getEventCostBreakdown(pricing, {
  guests: GuestChoice[];
  parkingNeeded: ParkingNeeded;
});
```

Legacy `CostCalculationInput` (single preference + shared lunch/dinner + numberOfGuests) becomes a thin adapter that expands to N identical guests — used only by old call sites until removed.

**Details string:** prefer count-oriented text, e.g.  
`3 people · Lunch veg×2 ₹300 · Lunch non-veg×1 ₹450 · Dinner veg×2 ₹500 · registration fee ₹100 × 3 · parking ₹200`

**Counts helper** (shared by admin + venue pass):

```ts
guestMealCounts(guests) → {
  lunchVeg, lunchNonVeg, dinnerVeg, dinnerNonVeg, noFood, people
}
```

---

## Registration UI

- Party size control unchanged (includes alumnus).
- Below it: **N rows** labeled “You” / “Guest 2” / …
- Each row: radio Veg · Non-veg · No food; checkboxes Lunch · Dinner (disabled/cleared when No food).
- Live cost uses `getEventCostBreakdown` on the guest array.
- Save / pay payload sends `guests` (+ `parking_needed`, profile fields). Server ignores client total; recomputes from `guests`.
- Prefill: load `guests` from API; if missing, synthesize from legacy fields and party size.

Remove the single global Food Preference + Meals block.

---

## Server / reprice

- `registerAccountForEvent`: validate `guests` (array length ≥ 1, normalize preferences/meals); set `number_of_guests = guests.length`; write `guests` + legacy summary columns; cost from guest array.
- `repriceRegistration` / `repriceEventRegistrations`: cost from `guests` (fallback expand legacy).
- Prefill / existing-registration helpers return `guests`.

---

## Admin & venue pass

- Venue pass `food` / `meals` lines: derived counts string (not a single diet label when mixed).
- Admin registrations table: show compact counts (tooltip or second line OK); keep total cost as today.
- Check-in lookup: same counts summary.

---

## Validation

Valid if any of:

- at least one guest has lunch or dinner, or
- parking ≠ `none`, or
- event `base_ticket_paise` > 0

Invalid: empty guests, or all no-food + no parking + zero registration fee.

---

## Testing

- Unit/self-check: mixed party totals (veg lunch + non-veg dinner + no-food + parking + fee).
- Migration shape: legacy row → guests array of length `number_of_guests`.
- Venue pass counts for mixed party.
- Prefill round-trip preserves per-person choices.

## Out of scope follow-ups

- Drop legacy `food_preference` / `lunch` / `dinner` columns
- Named guests / dietary notes beyond veg|non-veg|none
