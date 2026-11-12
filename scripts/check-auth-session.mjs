import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode('test-secret-at-least-32-chars-long!!');

async function create(accountId, email) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(accountId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

async function verify(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.email !== 'string') return null;
    return { accountId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

const token = await create('acc-1', 'a@example.com');
const ok = await verify(token);
const bad = await verify(token.slice(0, -4) + 'xxxx');
if (!ok || ok.accountId !== 'acc-1' || ok.email !== 'a@example.com' || bad !== null) {
  console.error('FAIL session self-check', { ok, bad });
  process.exit(1);
}
console.log('PASS session self-check');
