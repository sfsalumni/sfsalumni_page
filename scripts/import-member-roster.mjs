/**
 * Import Unique Records from sfs1.xlsx into public.member_roster.
 *
 * Dry run:  node --experimental-strip-types scripts/import-member-roster.mjs
 * Write:    node --experimental-strip-types scripts/import-member-roster.mjs --apply
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { registerHooks } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import { readUniqueRecordsSheet } from '../lib/member-roster-sheet.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sheetPath = path.join(root, 'sfs1.xlsx');

registerHooks({
  resolve(specifier, context, nextResolve) {
    let spec = specifier;
    if (spec.startsWith('@/')) spec = pathToFileURL(path.join(root, spec.slice(2))).href;
    if (spec.startsWith('.')) {
      const parent = context.parentURL ? fileURLToPath(context.parentURL) : root;
      const abs = path.resolve(path.dirname(parent), spec);
      if (!path.extname(abs) && existsSync(`${abs}.ts`)) spec = pathToFileURL(`${abs}.ts`).href;
    } else if (spec.startsWith('file:')) {
      const abs = fileURLToPath(spec);
      if (!path.extname(abs) && existsSync(`${abs}.ts`)) spec = pathToFileURL(`${abs}.ts`).href;
    }
    return nextResolve(spec, context);
  },
});

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const { planMemberRosterImport } = await import('../lib/registration/roster.ts');

loadEnvLocal();
const apply = process.argv.includes('--apply');

if (!existsSync(sheetPath)) {
  console.error(`Missing ${sheetPath}`);
  process.exit(1);
}

const sheetRows = readUniqueRecordsSheet(readFileSync(sheetPath));
const planned = planMemberRosterImport(sheetRows);
const withPhone = planned.rows.filter((row) => row.phones.length > 0).length;
const withEmail = planned.rows.filter((row) => row.email).length;

console.log(
  `Unique Records: ${sheetRows.length} rows → ${planned.rows.length} upsertable (${withPhone} phone, ${withEmail} email, ${planned.skipped} skipped)`
);
console.log('Prefer Admin → Import → “Import registration roster” for the same upload.');

if (!apply) {
  console.log('Dry run only. Re-run with --apply to upsert into member_roster.');
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const now = new Date().toISOString();
const rows = planned.rows.map((row) => ({ ...row, updated_at: now }));
let upserted = 0;
const chunkSize = 100;
for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize);
  const { error } = await admin.from('member_roster').upsert(chunk, { onConflict: 'record_id' });
  if (error) {
    console.error('upsert failed', error);
    process.exit(1);
  }
  upserted += chunk.length;
}

console.log(`Upserted ${upserted} member_roster rows.`);
