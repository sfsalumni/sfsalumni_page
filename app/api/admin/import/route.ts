import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { planAlumniImport, readAlumniSheet, toAccountRow } from '@/lib/alumni-import.mjs';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const MAX_BYTES = 5_000_000;

type AccountRow = {
  email: string;
  username: string;
  fullName: string;
  phone: string | null;
  batch: number | null;
  section: string | null;
  location: string | null;
  firstName: string;
  lastName: string;
};

function missingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message || '';
  return error.code === 'PGRST204' || error.code === '42703' || /column/i.test(message);
}

async function loadAccounts(): Promise<{ email: string; username: string | null; full_name: string | null; phone_number: string | null }[]> {
  const admin = createAdminClient();
  const rows: { email: string; username: string | null; full_name: string | null; phone_number: string | null }[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const full = await admin
      .from('alumni_accounts')
      .select('email,username,full_name,phone_number')
      .range(from, from + page - 1);
    const result = missingColumn(full.error)
      ? await admin.from('alumni_accounts').select('email,full_name,phone_number').range(from, from + page - 1)
      : full;
    if (result.error) throw new Error(result.error.message || 'Could not read accounts');
    for (const row of result.data || []) {
      const record = row as {
        email: string;
        username?: string | null;
        full_name: string | null;
        phone_number: string | null;
      };
      rows.push({
        email: String(record.email),
        username: record.username ? String(record.username) : null,
        full_name: record.full_name ? String(record.full_name) : null,
        phone_number: record.phone_number ? String(record.phone_number) : null,
      });
    }
    if (!result.data || result.data.length < page) break;
  }
  return rows;
}

async function insertAccounts(accounts: AccountRow[], passwordHash: string) {
  const admin = createAdminClient();
  const failures: { email: string }[] = [];
  let created = 0;
  let dropNameColumns = false;
  const chunkSize = 50;

  for (let index = 0; index < accounts.length; index += chunkSize) {
    const chunk = accounts.slice(index, index + chunkSize);
    const rows = chunk.map((account) => {
      const row = toAccountRow(account, passwordHash) as Record<string, unknown>;
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
      const row = toAccountRow(account, passwordHash) as Record<string, unknown>;
      if (dropNameColumns) {
        delete row.first_name;
        delete row.last_name;
        delete row.username;
      }
      const single = await admin.from('alumni_accounts').insert(row);
      if (single.error) failures.push({ email: account.email });
      else created += 1;
    }
  }

  return { created, failures };
}

export async function POST(request: Request) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const form = await request.formData();
    const file = form.get('file');
    const password = String(form.get('password') || '');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose the alumni workbook' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Upload the .xlsx workbook' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'That workbook is too large' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password for new accounts must be at least 8 characters' },
        { status: 400 }
      );
    }

    let sheet;
    try {
      sheet = readAlumniSheet(Buffer.from(await file.arrayBuffer()));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read that workbook';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (!sheet.length) {
      return NextResponse.json({ error: 'The workbook has no alumni rows' }, { status: 400 });
    }

    const known = await loadAccounts();
    const usernames: Record<string, string> = {};
    for (const row of known) usernames[row.email] = row.username || row.email;
    const placeholders = known
      .filter((row) => /^\d+@gmail\.com$/.test(row.email))
      .map((row) => ({
        name: row.full_name || '',
        phone: row.phone_number,
        email: row.email,
        username: row.username || row.email,
      }));
    const planned = planAlumniImport(
      sheet,
      known.map((row) => row.email),
      usernames,
      placeholders
    );
    const passwordHash = await bcrypt.hash(password, 10);
    const { created, failures } = await insertAccounts(planned.accounts, passwordHash);
    const failedEmails = new Set(failures.map((failure) => failure.email));
    const lines = planned.lines.map((line: { status: string; email: string }) =>
      line.status === 'create' && failedEmails.has(line.email) ? { ...line, status: 'failed' } : line
    );

    return NextResponse.json({ created, failed: failures.length, lines });
  } catch (err) {
    console.error('admin import', err);
    return NextResponse.json({ error: 'Could not import the workbook' }, { status: 500 });
  }
}
