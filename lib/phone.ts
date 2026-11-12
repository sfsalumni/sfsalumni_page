// lib/phone.ts — global ISD + national → E.164

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/** Common ISD / country calling codes for signup + registration dropdowns. */
export const COUNTRY_CALLING_CODES: ReadonlyArray<{ code: string; label: string }> = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA / Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+974', label: 'Qatar (+974)' },
  { code: '+973', label: 'Bahrain (+973)' },
  { code: '+968', label: 'Oman (+968)' },
  { code: '+965', label: 'Kuwait (+965)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+41', label: 'Switzerland (+41)' },
  { code: '+353', label: 'Ireland (+353)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+852', label: 'Hong Kong (+852)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+55', label: 'Brazil (+55)' },
];

const ISD_CODES_LONGEST_FIRST = [...COUNTRY_CALLING_CODES]
  .map((c) => c.code)
  .sort((a, b) => b.length - a.length);

/** Split stored E.164 into dropdown ISD + national number. */
export function splitE164(phone: string): { isd: string; national: string } {
  const normalized = normalizePhoneNumber(
    phone.startsWith('+') ? phone : phone ? `+${digitsOnly(phone)}` : ''
  );
  if (!normalized) return { isd: '+91', national: '' };
  for (const code of ISD_CODES_LONGEST_FIRST) {
    if (normalized.startsWith(code) && normalized.length > code.length) {
      return { isd: code, national: normalized.slice(code.length) };
    }
  }
  return { isd: '+91', national: normalized.slice(1) };
}

/** Per-ISD national-number rules (digits only). Unknown ISD → 4–12 national digits. */
const NATIONAL_RULES: Record<string, { len: number | [number, number]; pattern?: RegExp; hint: string }> = {
  '91': { len: 10, pattern: /^[6-9]\d{9}$/, hint: '10-digit Indian mobile starting with 6–9' },
  '1': { len: 10, pattern: /^[2-9]\d{9}$/, hint: '10-digit US/Canada number' },
  '44': { len: [10, 11], hint: '10–11 digit UK number' },
  '971': { len: 9, pattern: /^5\d{8}$/, hint: '9-digit UAE mobile starting with 5' },
  '966': { len: 9, pattern: /^5\d{8}$/, hint: '9-digit Saudi mobile starting with 5' },
  '65': { len: 8, pattern: /^[3689]\d{7}$/, hint: '8-digit Singapore number' },
  '61': { len: 9, pattern: /^4\d{8}$/, hint: '9-digit Australian mobile starting with 4' },
};

function nationalRule(isd: string) {
  return NATIONAL_RULES[digitsOnly(isd)] || null;
}

/**
 * Human-readable phone validation error, or null when valid.
 */
export function phoneValidationError(isd: string, national: string): string | null {
  const cc = digitsOnly(isd);
  const nn = digitsOnly(national);
  if (!cc) return 'Select a country calling code (ISD)';
  if (!nn) return 'Enter your phone number';

  const rule = nationalRule(isd);
  if (rule) {
    const okLen = Array.isArray(rule.len)
      ? nn.length >= rule.len[0] && nn.length <= rule.len[1]
      : nn.length === rule.len;
    if (!okLen || (rule.pattern && !rule.pattern.test(nn))) {
      return `Invalid phone for ${isd.startsWith('+') ? isd : `+${isd}`}: ${rule.hint}`;
    }
  } else {
    const combined = cc + nn;
    if (combined.length < 8 || combined.length > 15) {
      return 'Enter a valid phone number (8–15 digits including country code)';
    }
  }
  return null;
}

/** Hint under the phone field for the selected ISD. */
export function phoneInputHint(isd: string): string {
  const rule = nationalRule(isd);
  if (rule) return rule.hint;
  return 'Country code (ISD) + national number';
}

/**
 * Build E.164 from ISD/country code + national number.
 * Accepts ISD with or without leading +.
 * Returns null when country-specific (or generic length) rules fail.
 */
export function toE164(isd: string, national: string): string | null {
  if (phoneValidationError(isd, national)) return null;
  const cc = digitsOnly(isd);
  const nn = digitsOnly(national);
  return `+${cc}${nn}`;
}

/**
 * Normalize a single phone string to E.164.
 * Requires an international form (leading + or already digit-only 8–15 with implicit world format via +).
 * Strings without a country code (e.g. bare 10-digit local) return null.
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone || !String(phone).trim()) return null;
  const trimmed = String(phone).trim();
  // Require explicit international marker for single-field input
  if (!trimmed.startsWith('+')) return null;
  const digits = digitsOnly(trimmed);
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/**
 * Format E.164 for display: +91 98765 43210 style when long enough.
 */
export function formatPhoneForDisplay(e164: string): string {
  const normalized = normalizePhoneNumber(e164.startsWith('+') ? e164 : `+${digitsOnly(e164)}`);
  if (!normalized) return e164;
  const digits = normalized.slice(1);
  // Heuristic grouping: keep first 1–3 as country-ish, rest in chunks of 5/rest
  if (digits.length <= 8) return normalized;
  const ccLen = digits.length > 12 ? 2 : digits.length > 10 ? 2 : 1;
  const cc = digits.slice(0, ccLen);
  const rest = digits.slice(ccLen);
  if (rest.length <= 5) return `+${cc} ${rest}`;
  return `+${cc} ${rest.slice(0, Math.ceil(rest.length / 2))} ${rest.slice(Math.ceil(rest.length / 2))}`;
}

export function phoneNumbersMatch(phone1: string, phone2: string): boolean {
  const a = normalizePhoneNumber(phone1.startsWith('+') ? phone1 : `+${digitsOnly(phone1)}`);
  const b = normalizePhoneNumber(phone2.startsWith('+') ? phone2 : `+${digitsOnly(phone2)}`);
  return Boolean(a && b && a === b);
}
