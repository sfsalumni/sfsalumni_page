import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('FAIL: missing Supabase env');
  process.exit(1);
}

const res = await fetch(
  `${url}/rest/v1/event_catalog?select=id,is_primary,lunch_paise&is_primary=eq.true`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const text = await res.text();
if (!res.ok) {
  console.error('FAIL:', res.status, text);
  process.exit(1);
}
const rows = JSON.parse(text);
if (!Array.isArray(rows) || rows.length !== 1) {
  console.error('FAIL: expected exactly one primary event, got', rows);
  process.exit(1);
}
if (rows[0].lunch_paise !== 30000) {
  console.error('FAIL: expected lunch_paise 30000, got', rows[0].lunch_paise);
  process.exit(1);
}
console.log('PASS event catalog schema');
