/** Consumer / public mailbox domains — rejects corporate and unknown domains. */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'rediffmail.com',
  'aol.com',
  'zoho.com',
]);

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function isPublicEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_SHAPE.test(normalized)) return false;
  const domain = normalized.slice(normalized.lastIndexOf('@') + 1);
  return PUBLIC_EMAIL_DOMAINS.has(domain);
}
