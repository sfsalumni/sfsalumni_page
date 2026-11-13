// Server-side member_roster lookup for registration prefill.

import { createAdminClient } from '@/lib/supabase-admin';
import {
  matchRosterRows,
  normalizeRosterEmail,
  normalizeRosterPhones,
  type RosterMatchResult,
  type RosterRow,
} from '@/lib/registration/roster';
import { normalizeFoodPreference } from '@/lib/registration/registration';

type DbRow = {
  id: string;
  record_id: string;
  given_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phones: string[] | null;
  batch: number | null;
  section: string | null;
  current_location: string | null;
  food_preference: string | null;
  number_of_guests: number | null;
  has_parking: boolean | null;
  two_wheeler_count: number | null;
  four_wheeler_count: number | null;
  attending: boolean | null;
};

function toRosterRow(row: DbRow): RosterRow {
  return {
    id: row.id,
    record_id: row.record_id,
    given_name: row.given_name || '',
    last_name: row.last_name || '',
    full_name: row.full_name || '',
    email: row.email,
    phones: Array.isArray(row.phones) ? row.phones : [],
    batch: row.batch,
    section: row.section,
    current_location: row.current_location,
    food_preference: normalizeFoodPreference(row.food_preference),
    number_of_guests: Math.max(0, Math.floor(Number(row.number_of_guests) || 0)),
    has_parking: row.has_parking === true,
    two_wheeler_count: Math.max(0, Math.floor(Number(row.two_wheeler_count) || 0)),
    four_wheeler_count: Math.max(0, Math.floor(Number(row.four_wheeler_count) || 0)),
    attending: row.attending !== false,
  };
}

const SELECT =
  'id,record_id,given_name,last_name,full_name,email,phones,batch,section,current_location,food_preference,number_of_guests,has_parking,two_wheeler_count,four_wheeler_count,attending';

async function fetchByPhones(phones: string[]): Promise<DbRow[]> {
  if (!phones.length) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.from('member_roster').select(SELECT).overlaps('phones', phones).limit(40);
  if (error) {
    console.error('roster lookup phones', error);
    return [];
  }
  return (data || []) as DbRow[];
}

async function fetchByEmail(email: string | null): Promise<DbRow[]> {
  if (!email) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.from('member_roster').select(SELECT).ilike('email', email).limit(20);
  if (error) {
    console.error('roster lookup email', error);
    return [];
  }
  return (data || []) as DbRow[];
}

async function fetchByName(name: string | null): Promise<DbRow[]> {
  if (!name || name.length < 2) return [];
  const admin = createAdminClient();
  const pattern = `%${name.replace(/[%_,]/g, ' ').trim()}%`;
  const { data, error } = await admin.from('member_roster').select(SELECT).ilike('full_name', pattern).limit(20);
  if (error) {
    console.error('roster lookup name', error);
    return [];
  }
  return (data || []) as DbRow[];
}

function queryPhones(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = String(raw).trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('+')) return normalizeRosterPhones(trimmed);
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return normalizeRosterPhones(digits);
  if (digits.length >= 8) return normalizeRosterPhones(`+${digits}`);
  return [];
}

/** Look up roster rows and classify exact vs confirm vs none. */
export async function lookupMemberRoster(input: {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
}): Promise<RosterMatchResult> {
  const phones = queryPhones(input.phone);
  const email = normalizeRosterEmail(input.email || null);
  const name = String(input.name || '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!phones.length && !email && name.length < 2) {
    return { kind: 'none', matches: [] };
  }

  const [byPhone, byEmail, byName] = await Promise.all([
    fetchByPhones(phones),
    fetchByEmail(email),
    // Only hit name when phone/email did not already give us a path — still fetch for matchRosterRows fallback
    fetchByName(name || null),
  ]);

  const byId = new Map<string, DbRow>();
  for (const row of [...byPhone, ...byEmail, ...byName]) {
    byId.set(row.id, row);
  }

  return matchRosterRows(
    [...byId.values()].map(toRosterRow),
    { phone: input.phone, email: input.email, name: name || null }
  );
}
