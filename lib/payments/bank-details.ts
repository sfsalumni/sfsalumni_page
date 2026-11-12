/** Bank / UPI account helpers and offline-proof field validation. */

export type BankAccountPublic = {
  id: string;
  label: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  bank_name: string | null;
  upi_id: string | null;
};

export const OFFLINE_PROOF_MAX_BYTES = 4_000_000;

const PROOF_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ACCOUNT_NUMBER_RE = /^\d{6,18}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function normalizeIfsc(raw: unknown): string | null {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!IFSC_RE.test(s)) return null;
  return s;
}

export function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Pure helper — no framework deps */
export function buildUpiPayUri(opts: {
  upiId: string;
  amountPaise: number;
  payeeName?: string;
  note?: string;
}): string | null {
  const pa = String(opts.upiId || '').trim();
  const amountPaise = Math.floor(Number(opts.amountPaise) || 0);
  if (!pa || amountPaise <= 0) return null;
  const am = (amountPaise / 100).toFixed(2);
  const params = new URLSearchParams();
  params.set('pa', pa);
  const pn = String(opts.payeeName || '').trim();
  if (pn) params.set('pn', pn);
  params.set('am', am);
  params.set('cu', 'INR');
  const tn = String(opts.note || '').trim();
  if (tn) params.set('tn', tn);
  return `upi://pay?${params.toString()}`;
}

export type BankAccountInput = {
  label: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  bank_name?: string | null;
  upi_id?: string | null;
};

/** Throws Error with an admin-facing message when invalid. */
export function validateBankAccountFields(input: BankAccountInput): {
  label: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  bank_name: string | null;
  upi_id: string | null;
} {
  const label = String(input.label || '').trim();
  if (!label) throw new Error('Label is required');

  const account_name = String(input.account_name || '').trim();
  if (!account_name) throw new Error('Account name is required');

  const account_number = String(input.account_number || '').replace(/\s+/g, '');
  if (!ACCOUNT_NUMBER_RE.test(account_number)) {
    throw new Error('Account number must be 6–18 digits');
  }

  const ifsc = normalizeIfsc(input.ifsc);
  if (!ifsc) {
    throw new Error('IFSC must look like SBIN0001234');
  }

  const bankRaw = input.bank_name != null ? String(input.bank_name).trim() : '';
  const bank_name = bankRaw || null;

  const upiRaw = input.upi_id != null ? String(input.upi_id).trim() : '';
  if (upiRaw && !upiRaw.includes('@')) {
    throw new Error('UPI ID must look like name@bank');
  }
  const upi_id = upiRaw || null;

  return { label, account_name, account_number, ifsc, bank_name, upi_id };
}

export type OfflineProofFile = { name?: string; type: string; size: number };

export type OfflineProofOk = {
  utr: string | null;
  file: { ext: string; type: string; size: number; name?: string } | null;
};

/** Throws Error with a member-facing message when invalid. */
export function assertOfflineProofFields(input: {
  utr: unknown;
  file: OfflineProofFile | null | undefined;
}): OfflineProofOk {
  const utr = String(input.utr ?? '').trim();
  const file = input.file ?? null;

  if (!utr && !file) {
    throw new Error('Add a UTR reference or a payment screenshot');
  }

  if (file) {
    if (file.size > OFFLINE_PROOF_MAX_BYTES) {
      throw new Error('Screenshot must be 4 MB or smaller');
    }
    const ext = PROOF_MIME[file.type];
    if (!ext) throw new Error('Screenshot must be JPEG, PNG, or WebP');
    return {
      utr: utr || null,
      file: { ext, type: file.type, size: file.size, name: file.name },
    };
  }

  return { utr: utr || null, file: null };
}

export function toBankAccountPublic(row: {
  id: string;
  label: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  bank_name: string | null;
  upi_id: string | null;
}): BankAccountPublic {
  return {
    id: String(row.id),
    label: String(row.label || ''),
    account_name: String(row.account_name || ''),
    account_number: String(row.account_number || ''),
    ifsc: String(row.ifsc || ''),
    bank_name: row.bank_name ? String(row.bank_name) : null,
    upi_id: row.upi_id ? String(row.upi_id) : null,
  };
}

/** Admin form input (camelCase or snake_case). */
export function assertPaymentAccountInput(body: Record<string, unknown>): {
  label: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  bank_name: string | null;
  upi_id: string | null;
  active: boolean;
  sort_order: number;
} {
  const base = validateBankAccountFields({
    label: String(body.label ?? ''),
    account_name: String(body.accountName ?? body.account_name ?? ''),
    account_number: String(body.accountNumber ?? body.account_number ?? ''),
    ifsc: String(body.ifsc ?? ''),
    bank_name: (body.bankName ?? body.bank_name) as string | null | undefined,
    upi_id: (body.upiId ?? body.upi_id) as string | null | undefined,
  });
  const active = body.active === true || body.active === 'true';
  const sort_order = Math.trunc(Number(body.sortOrder ?? body.sort_order) || 0);
  return { ...base, active, sort_order };
}
