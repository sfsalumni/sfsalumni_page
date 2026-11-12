import { randomInt } from 'node:crypto';

/** No 0/O or 1/I/L — these are read aloud at the venue gate. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function registrationCodeFrom(bytes: ArrayLike<number>): string {
  let body = '';
  for (let i = 0; i < 5; i++) {
    const n = Math.abs(Math.floor(Number(bytes[i]) || 0));
    body += ALPHABET[n % ALPHABET.length];
  }
  return `SFS-${body}`;
}

export function newRegistrationCode(): string {
  return registrationCodeFrom([0, 1, 2, 3, 4].map(() => randomInt(ALPHABET.length)));
}

/** Accepts "sfs 4k7m2", "4K7M2", or the stored "SFS-4K7M2". */
export function normalizeRegistrationCode(raw: string): string {
  const compact = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!compact) return '';
  const body = compact.startsWith('SFS') ? compact.slice(3) : compact;
  return body ? `SFS-${body}` : '';
}

export function shouldIssueRegistrationCode(
  status: string,
  existing: string | null | undefined
): boolean {
  return status === 'paid' && !String(existing || '').trim();
}

export function missingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message || '';
  return error.code === 'PGRST204' || error.code === '42703' || /column/i.test(message);
}

type CodeResult = {
  data: { registration_code?: string | null } | null;
  error: { code?: string; message?: string } | null;
};

type CodeQuery = {
  select: (cols: string) => CodeQuery;
  update: (patch: { registration_code: string }) => CodeQuery;
  eq: (col: string, val: string) => CodeQuery;
  is: (col: string, val: null) => CodeQuery;
  maybeSingle: () => Promise<CodeResult>;
};

export type RegistrationCodeAdmin = {
  from: (table: string) => CodeQuery;
};

export async function readRegistrationCode(
  admin: RegistrationCodeAdmin,
  registrationId: string
): Promise<string | null> {
  const current = await admin
    .from('event_registrations')
    .select('registration_code')
    .eq('id', registrationId)
    .maybeSingle();
  if (current.error) return null;
  return current.data?.registration_code || null;
}

/** Gives an ID to registrations that are already fully paid and still have none. */
export async function issueMissingPaidCodes(admin: RegistrationCodeAdmin): Promise<void> {
  const listed = (await admin
    .from('event_registrations')
    .select('id')
    .eq('payment_status', 'paid')
    .is('registration_code', null)) as unknown as {
    data: { id?: string }[] | null;
    error: { code?: string; message?: string } | null;
  };
  if (listed.error || !listed.data) return;
  for (const row of listed.data) {
    if (row.id) await ensureRegistrationCode(admin, row.id, 'paid');
  }
}

/** Writes a code once, only when the registration is fully paid. */
export async function ensureRegistrationCode(
  admin: RegistrationCodeAdmin,
  registrationId: string,
  paymentStatus: string,
  makeCode: () => string = newRegistrationCode
): Promise<string | null> {
  if (paymentStatus !== 'paid') return null;

  const current = await admin
    .from('event_registrations')
    .select('registration_code')
    .eq('id', registrationId)
    .maybeSingle();
  if (current.error) return null;

  const existing = current.data?.registration_code || null;
  if (!shouldIssueRegistrationCode(paymentStatus, existing)) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const saved = await admin
      .from('event_registrations')
      .update({ registration_code: code })
      .eq('id', registrationId)
      .is('registration_code', null)
      .select('registration_code')
      .maybeSingle();
    if (saved.error) {
      if (missingColumn(saved.error)) return null;
      continue;
    }
    if (saved.data?.registration_code) return saved.data.registration_code;
  }
  return null;
}
