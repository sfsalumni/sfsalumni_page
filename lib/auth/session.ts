import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'sfs_session';

export type SessionPayload = {
  accountId: string;
  email: string;
};

const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET is missing or too short');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.accountId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const accountId = payload.sub;
    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!accountId || !email) return null;
    return { accountId, email };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: MAX_AGE_SEC,
};
