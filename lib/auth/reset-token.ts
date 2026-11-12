import { createHash, randomBytes } from 'crypto';

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function createResetTokenPlain(): string {
  return randomBytes(32).toString('base64url');
}

export function hashResetToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

export function resetExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + RESET_TOKEN_TTL_MS);
}
