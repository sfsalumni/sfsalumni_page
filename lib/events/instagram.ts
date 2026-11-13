const MAX_URL = 500;

/** Empty → null. Non-empty must be http(s). Throws Error with admin-facing message. */
export function normalizeInstagramUrl(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (raw.length > MAX_URL) {
    throw new Error(`Instagram URL must be ${MAX_URL} characters or fewer`);
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('bad protocol');
    }
  } catch {
    throw new Error('Instagram URL must be a valid http(s) link');
  }
  return raw;
}
