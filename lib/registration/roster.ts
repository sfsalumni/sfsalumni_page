// lib/registration/roster.ts
// Pure helpers for Unique Records → member_roster import and registration lookup.
// Phone/email/name matching only — no database access.

import { normalizeFoodPreference, type FoodPreference } from '@/lib/registration/registration';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_10 = /^(?:0{10}|([0-9])\1{9}|9000000000|8000000000|7000000000)$/;

export type RosterMatchType = 'exact' | 'phone_only' | 'email_only' | 'name';

export type RosterRow = {
  id: string;
  record_id: string;
  given_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phones: string[];
  batch: number | null;
  section: string | null;
  current_location: string | null;
  food_preference: FoodPreference;
  number_of_guests: number;
  has_parking: boolean;
  two_wheeler_count: number;
  four_wheeler_count: number;
  attending: boolean;
};

export type RosterPrefill = {
  id: string;
  record_id: string;
  phone_number: string;
  email: string;
  given_name: string;
  full_name: string;
  last_name: string;
  batch?: number;
  section?: string;
  current_location?: string;
  food_preference: FoodPreference;
  number_of_guests: number;
  guests_eating: number;
  has_parking: boolean;
  two_wheeler_count: number;
  four_wheeler_count: number;
  attending: boolean;
  match_type: RosterMatchType;
};

/** Public (unsigned) lookups must include phone or email — name-only would scrape the roster. */
export function assertRosterLookupQuery(query: {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const phone = String(query.phone || '').trim();
  const email = String(query.email || '').trim();
  if (phone || email) return { ok: true };
  return { ok: false, error: 'Enter a phone number or email to look up' };
}

/** Admin Import copy after clearing member_roster. */
export function formatRosterClearedMessage(deleted: number): string {
  const n = Math.max(0, Math.floor(Number(deleted) || 0));
  if (n === 0) return 'Roster is already empty.';
  if (n === 1) return 'Cleared 1 roster row.';
  return `Cleared ${n} roster rows.`;
}

export type RosterMatchResult = {
  kind: 'exact' | 'confirm' | 'none';
  matches: RosterPrefill[];
};

export type ParsedUniqueRecord = {
  record_id: string;
  given_name: string;
  last_name: string;
  full_name: string;
  batch: number | null;
  section: string | null;
  current_location: string | null;
  email: string | null;
  phones: string[];
  food_preference: FoodPreference;
  number_of_guests: number;
  has_parking: boolean;
  two_wheeler_count: number;
  four_wheeler_count: number;
  attending: boolean;
  attendance_raw: string | null;
  parking_raw: string | null;
  review_needed: boolean;
};

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function isPlaceholderPhone(digits: string): boolean {
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return PLACEHOLDER_10.test(last10);
}

/** Split a sheet phone cell into valid E.164 numbers. Drops placeholders. */
export function normalizeRosterPhones(raw: unknown): string[] {
  const text = cleanText(raw);
  if (!text) return [];
  const parts = text.split(/[;,/|]+|\s{2,}/).flatMap((part) => part.split(/\s+/));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const digits = digitsOnly(part);
    if (!digits || isPlaceholderPhone(digits)) continue;
    let e164: string | null = null;
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) e164 = `+91${digits}`;
    else if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
      e164 = `+${digits}`;
    } else if (digits.length >= 8 && digits.length <= 15 && part.trim().startsWith('+')) {
      e164 = `+${digits}`;
    } else if (digits.length >= 11 && digits.length <= 15) {
      e164 = `+${digits}`;
    }
    if (!e164 || seen.has(e164)) continue;
    seen.add(e164);
    out.push(e164);
  }
  return out;
}

export function normalizeRosterEmail(raw: unknown): string | null {
  const email = cleanText(raw).toLowerCase().replace(/\s+/g, '');
  if (!email || !EMAIL_SHAPE.test(email)) return null;
  return email;
}

function phoneKeys(phones: string[]): Set<string> {
  const keys = new Set<string>();
  for (const phone of phones) {
    const digits = digitsOnly(phone);
    if (!digits) continue;
    keys.add(digits);
    if (digits.length >= 10) keys.add(digits.slice(-10));
  }
  return keys;
}

function queryPhones(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = String(raw).trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('+')) return normalizeRosterPhones(trimmed);
  const digits = digitsOnly(trimmed);
  if (digits.length === 10) return normalizeRosterPhones(digits);
  if (digits.length >= 8) return normalizeRosterPhones(`+${digits}`);
  return [];
}

function parseBatch(raw: unknown): number | null {
  const digits = digitsOnly(String(raw ?? ''));
  if (digits.length !== 4) return null;
  const year = Number(digits);
  if (year < 1970 || year > new Date().getFullYear() + 1) return null;
  return year;
}

function parseSection(raw: unknown): string | null {
  const value = cleanText(raw).toUpperCase();
  if (!value) return null;
  if (/^[ABCD]$/.test(value)) return value;
  return null;
}

function parseAttendance(raw: unknown): boolean {
  const value = cleanText(raw).toLowerCase();
  if (!value) return true;
  if (value === 'no' || value.startsWith('no ')) return false;
  return true;
}

function parseFood(raw: unknown): FoodPreference {
  const value = cleanText(raw).toLowerCase();
  if (value.includes('non')) return 'non-veg';
  return normalizeFoodPreference(value === 'veg' ? 'veg' : 'veg');
}

function parseParking(raw: unknown): {
  has_parking: boolean;
  two_wheeler_count: number;
  four_wheeler_count: number;
} {
  const value = cleanText(raw).toLowerCase();
  if (!value || value.includes('unspecified') || value.includes('no vehicle') || value === 'no') {
    return { has_parking: false, two_wheeler_count: 0, four_wheeler_count: 0 };
  }
  if (value.includes('4')) {
    return { has_parking: true, two_wheeler_count: 0, four_wheeler_count: 1 };
  }
  if (value.includes('2')) {
    return { has_parking: true, two_wheeler_count: 1, four_wheeler_count: 0 };
  }
  return { has_parking: false, two_wheeler_count: 0, four_wheeler_count: 0 };
}

function cell(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in row && row[key] != null && String(row[key]).trim() !== '') return row[key];
  }
  // Case-insensitive fallback
  const lower = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
  for (const key of keys) {
    const real = lower.get(key.toLowerCase());
    if (real && row[real] != null && String(row[real]).trim() !== '') return row[real];
  }
  return undefined;
}

/** Map one Unique Records sheet row into a roster insert shape. */
export function parseUniqueRecordRow(row: Record<string, unknown>): ParsedUniqueRecord {
  const given = cleanText(cell(row, 'Given name', 'given_name'));
  const last = cleanText(cell(row, 'Last name', 'last_name'));
  const parking = parseParking(cell(row, 'Parking', 'parking'));
  const guestsRaw = cell(row, 'Known confirmed guests', 'number_of_guests', 'Guests (excluding alumni)');
  const guests = Math.max(0, Math.min(9, Math.floor(Number(guestsRaw) || 0)));
  const email =
    normalizeRosterEmail(cell(row, 'Valid normalized email', 'Preferred email', 'email')) || null;
  const phones = normalizeRosterPhones(
    cell(row, 'Normalized phone(s)', 'Contact number (source text)', 'phones') || ''
  );
  const recordId = cleanText(cell(row, 'Record ID', 'record_id')) || 'UNKNOWN';
  const attendanceRaw = cleanText(cell(row, 'Attendance', 'attendance')) || null;
  return {
    record_id: recordId,
    given_name: given,
    last_name: last,
    full_name: [given, last].filter(Boolean).join(' '),
    batch: parseBatch(cell(row, 'Pass-out year', 'batch')),
    section: parseSection(cell(row, 'Section', 'section')),
    current_location: cleanText(cell(row, 'Current location', 'current_location')) || null,
    email,
    phones,
    food_preference: parseFood(cell(row, 'Food preference', 'food_preference')),
    number_of_guests: guests,
    has_parking: parking.has_parking,
    two_wheeler_count: parking.two_wheeler_count,
    four_wheeler_count: parking.four_wheeler_count,
    attending: parseAttendance(attendanceRaw),
    attendance_raw: attendanceRaw,
    parking_raw: cleanText(cell(row, 'Parking', 'parking')) || null,
    review_needed: /yes/i.test(cleanText(cell(row, 'Review needed', 'review_needed'))),
  };
}

export type MemberRosterUpsert = {
  record_id: string;
  given_name: string;
  last_name: string;
  full_name: string;
  batch: number | null;
  section: string | null;
  current_location: string | null;
  email: string | null;
  phones: string[];
  food_preference: FoodPreference;
  number_of_guests: number;
  has_parking: boolean;
  two_wheeler_count: number;
  four_wheeler_count: number;
  attending: boolean;
  attendance_raw: string | null;
  parking_raw: string | null;
  review_needed: boolean;
};

/** DB upsert payload for one parsed Unique Records row. */
export function toMemberRosterUpsert(parsed: ParsedUniqueRecord): MemberRosterUpsert {
  return {
    record_id: parsed.record_id,
    given_name: parsed.given_name,
    last_name: parsed.last_name,
    full_name: parsed.full_name,
    batch: parsed.batch,
    section: parsed.section,
    current_location: parsed.current_location,
    email: parsed.email,
    phones: parsed.phones,
    food_preference: parsed.food_preference,
    number_of_guests: parsed.number_of_guests,
    has_parking: parsed.has_parking,
    two_wheeler_count: parsed.two_wheeler_count,
    four_wheeler_count: parsed.four_wheeler_count,
    attending: parsed.attending,
    attendance_raw: parsed.attendance_raw,
    parking_raw: parsed.parking_raw,
    review_needed: parsed.review_needed,
  };
}

/**
 * Parse Unique Records sheet objects into upsert rows.
 * Skips blank Record IDs and later duplicates of the same Record ID.
 */
export function planMemberRosterImport(sheetRows: Record<string, unknown>[]): {
  rows: MemberRosterUpsert[];
  skipped: number;
} {
  const seen = new Set<string>();
  const rows: MemberRosterUpsert[] = [];
  let skipped = 0;
  for (const sheetRow of sheetRows) {
    const parsed = parseUniqueRecordRow(sheetRow);
    if (!parsed.record_id || parsed.record_id === 'UNKNOWN') {
      skipped += 1;
      continue;
    }
    if (seen.has(parsed.record_id)) {
      skipped += 1;
      continue;
    }
    seen.add(parsed.record_id);
    rows.push(toMemberRosterUpsert(parsed));
  }
  return { rows, skipped };
}

export function rosterRowToPrefill(row: RosterRow, matchType: RosterMatchType): RosterPrefill {
  return {
    id: row.id,
    record_id: row.record_id,
    phone_number: row.phones[0] || '',
    email: row.email || '',
    given_name: row.given_name || '',
    full_name: row.full_name || [row.given_name, row.last_name].filter(Boolean).join(' '),
    last_name: row.last_name || '',
    batch: row.batch ?? undefined,
    section: row.section || undefined,
    current_location: row.current_location || undefined,
    food_preference: row.food_preference,
    number_of_guests: row.number_of_guests,
    guests_eating: row.number_of_guests,
    has_parking: row.has_parking,
    two_wheeler_count: row.two_wheeler_count,
    four_wheeler_count: row.four_wheeler_count,
    attending: row.attending,
    match_type: matchType,
  };
}

function rowMatchesPhone(row: RosterRow, phones: string[]): boolean {
  if (!phones.length) return false;
  const keys = phoneKeys(row.phones);
  for (const phone of phones) {
    const digits = digitsOnly(phone);
    if (!digits) continue;
    if (keys.has(digits) || (digits.length >= 10 && keys.has(digits.slice(-10)))) return true;
  }
  return false;
}

function rowMatchesEmail(row: RosterRow, email: string | null): boolean {
  if (!email || !row.email) return false;
  return row.email === email;
}

function rowMatchesName(row: RosterRow, name: string | null): boolean {
  if (!name) return false;
  const needle = name.toLowerCase().replace(/\s+/g, ' ').trim();
  if (needle.length < 2) return false;
  const hay = `${row.given_name} ${row.last_name} ${row.full_name}`.toLowerCase().replace(/\s+/g, ' ');
  return hay.includes(needle);
}

/**
 * Rank roster candidates for registration prefill.
 * Exact = one row matches both phone and email when both were provided.
 * Otherwise phone → email → name, capped for confirm UI.
 */
export function matchRosterRows(
  rows: RosterRow[],
  query: { phone?: string | null; email?: string | null; name?: string | null }
): RosterMatchResult {
  const phones = queryPhones(query.phone || null);
  const email = normalizeRosterEmail(query.email || null);
  const name = cleanText(query.name || null).toLowerCase() || null;

  const both =
    phones.length > 0 && email
      ? rows.filter((row) => rowMatchesPhone(row, phones) && rowMatchesEmail(row, email))
      : [];
  if (both.length === 1) {
    return { kind: 'exact', matches: [rosterRowToPrefill(both[0], 'exact')] };
  }
  if (both.length > 1) {
    return {
      kind: 'confirm',
      matches: both.slice(0, 8).map((row) => rosterRowToPrefill(row, 'exact')),
    };
  }

  if (phones.length) {
    const hits = rows.filter((row) => rowMatchesPhone(row, phones));
    if (hits.length) {
      return {
        kind: 'confirm',
        matches: hits.slice(0, 8).map((row) => rosterRowToPrefill(row, 'phone_only')),
      };
    }
  }

  if (email) {
    const hits = rows.filter((row) => rowMatchesEmail(row, email));
    if (hits.length) {
      return {
        kind: 'confirm',
        matches: hits.slice(0, 8).map((row) => rosterRowToPrefill(row, 'email_only')),
      };
    }
  }

  if (name) {
    const hits = rows.filter((row) => rowMatchesName(row, name));
    if (hits.length) {
      return {
        kind: 'confirm',
        matches: hits.slice(0, 8).map((row) => rosterRowToPrefill(row, 'name')),
      };
    }
  }

  return { kind: 'none', matches: [] };
}
