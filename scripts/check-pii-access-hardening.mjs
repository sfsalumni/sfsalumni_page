/**
 * Static check: PII hardening migration covers required tables + policy drops.
 * Run: node scripts/check-pii-access-hardening.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = 'supabase/migrations/20261113150000_pii_access_hardening.sql';
const sql = readFileSync(path.join(root, rel), 'utf8');
const mirror = readFileSync(
  path.join(root, 'migrations/01_schema/20261113150000_pii_access_hardening.sql'),
  'utf8'
);

assert.equal(sql, mirror, 'supabase and 01_schema migration bodies must match');

const requiredTables = [
  'alumni_accounts',
  'member_roster',
  'event_registrations',
  'push_subscriptions',
  'event_broadcasts',
  'users',
  'alumni_events',
];

for (const table of requiredTables) {
  assert.match(sql, new RegExp(`'${table}'`), `migration must include ${table}`);
}

assert.match(sql, /revoke all on table public\.%I from anon, authenticated/i);
assert.match(sql, /grant all on table public\.%I to service_role/i);
assert.match(sql, /SFS users read own profile or admins read users/);
assert.match(sql, /SFS verified members read published events/);
assert.match(sql, /SFS admins manage memories/);
assert.doesNotMatch(
  sql,
  /'committee_members'/,
  'must not include committee_members in the revoke list'
);

console.log('check-pii-access-hardening: ok');
