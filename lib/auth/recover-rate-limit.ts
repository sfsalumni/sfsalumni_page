/** ponytail: in-memory rate limit (ceiling ~1k concurrent; upgrade to Redis/KV if multi-instance). */

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  __sfsRecoverBuckets?: Map<string, Bucket>;
};

function store(): Map<string, Bucket> {
  if (!globalStore.__sfsRecoverBuckets) {
    globalStore.__sfsRecoverBuckets = new Map();
  }
  return globalStore.__sfsRecoverBuckets;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Returns true when the key has exceeded maxAttempts in the window. */
export function hitRateLimit(
  key: string,
  maxAttempts: number = MAX_ATTEMPTS,
  windowMs: number = WINDOW_MS
): boolean {
  const now = Date.now();
  const buckets = store();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  existing.count += 1;
  return existing.count > maxAttempts;
}

export function recoverRateLimited(key: string): boolean {
  return hitRateLimit(key, MAX_ATTEMPTS, WINDOW_MS);
}
