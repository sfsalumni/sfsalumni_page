/**
 * Create alumni login accounts from "50th alumni.xlsx".
 * Saves name, batch, section, location, phone, and email.
 * Does not create event registrations.
 *
 * Dry run:  node scripts/import-alumni-sheet.mjs
 * Write:    IMPORT_PASSWORD='…' node scripts/import-alumni-sheet.mjs --apply
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { planAlumniImport, readAlumniSheet, toAccountRow } from '../lib/alumni-import.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sheetPath = path.join(root, '50th alumni.xlsx');
const reportPath = path.join(root, 'alumni-import-report.json');

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

function readSheet() {
  return readAlumniSheet(readFileSync(sheetPath));
}

async function existingAccounts(admin) {
  const accounts = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await admin
      .from('alumni_accounts')
      .select('email,username,full_name,phone_number')
      .range(from, from + page - 1);
    if (error) throw new Error(error.message || 'Could not read existing accounts');
    for (const row of data || []) accounts.push(row);
    if (!data || data.length < page) break;
  }
  return accounts;
}

function missingColumn(error) {
  if (!error) return false;
  const message = error.message || '';
  return error.code === 'PGRST204' || error.code === '42703' || /column/i.test(message);
}

async function insertAccounts(admin, accounts, passwordHash) {
  const failures = [];
  let created = 0;
  let dropNameColumns = false;
  const chunkSize = 50;

  for (let index = 0; index < accounts.length; index += chunkSize) {
    const chunk = accounts.slice(index, index + chunkSize);
    const rows = chunk.map((account) => {
      const row = toAccountRow(account, passwordHash);
      if (dropNameColumns) {
        delete row.first_name;
        delete row.last_name;
        delete row.username;
      }
      return row;
    });
    const { error } = await admin.from('alumni_accounts').insert(rows);
    if (!error) {
      created += chunk.length;
      continue;
    }
    if (missingColumn(error) && !dropNameColumns) {
      dropNameColumns = true;
      index -= chunkSize;
      continue;
    }
    for (const account of chunk) {
      const row = toAccountRow(account, passwordHash);
      if (dropNameColumns) {
        delete row.first_name;
        delete row.last_name;
        delete row.username;
      }
      const single = await admin.from('alumni_accounts').insert(row);
      if (single.error) failures.push({ email: account.email, name: account.fullName, error: single.error.message });
      else created += 1;
    }
  }

  return { created, failures };
}

function summarize(sheetRows, planned) {
  const counts = { 'no-email': 0, 'duplicate-email': 0, existing: 0, 'no-name': 0 };
  for (const skip of planned.skipped) counts[skip.reason] += 1;
  return {
    sheetRows: sheetRows.length,
    create: planned.accounts.length,
    skipped: planned.skipped.length,
    ...counts,
    missingPhone: planned.accounts.filter((account) => !account.phone).length,
    missingBatch: planned.accounts.filter((account) => account.batch == null).length,
    missingSection: planned.accounts.filter((account) => !account.section).length,
  };
}

loadEnvLocal();
const apply = process.argv.includes('--apply');
const sheetRows = readSheet();

let knownAccounts = [];
if (apply || process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (apply) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  } else {
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    knownAccounts = await existingAccounts(admin);
  }
}

const usernames = {};
for (const row of knownAccounts) usernames[row.email] = row.username || row.email;
const placeholders = knownAccounts
  .filter((row) => /^\d+@gmail\.com$/.test(String(row.email || '')))
  .map((row) => ({
    name: row.full_name || '',
    phone: row.phone_number,
    email: row.email,
    username: row.username || row.email,
  }));
const planned = planAlumniImport(
  sheetRows,
  knownAccounts.map((row) => row.email),
  usernames,
  placeholders
);
const summary = summarize(sheetRows, planned);
const report = {
  applied: false,
  summary,
  accounts: planned.accounts.map((account) => ({
    name: account.fullName,
    username: account.username,
    email: account.email,
    phone: account.phone,
    batch: account.batch,
    section: account.section,
    location: account.location,
  })),
  skipped: planned.skipped,
};

if (!apply) {
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Dry run. Report: ${reportPath}`);
  process.exit(0);
}

const password = process.env.IMPORT_PASSWORD || '';
if (password.length < 8) {
  throw new Error('Set IMPORT_PASSWORD to at least 8 characters');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const passwordHash = await bcrypt.hash(password, 10);
const { created, failures } = await insertAccounts(admin, planned.accounts, passwordHash);
report.applied = true;
report.summary.created = created;
report.summary.failed = failures.length;
report.failures = failures;
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...summary, created, failed: failures.length }, null, 2));
if (failures.length) {
  console.error(failures.slice(0, 5));
  process.exit(1);
}
