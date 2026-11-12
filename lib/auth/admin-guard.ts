import { getCurrentAccount, type AlumniAccount } from '@/lib/auth/request';

/** Verified committee admin, or null if the request is not allowed. */
export async function requireVerifiedAdmin(): Promise<AlumniAccount | null> {
  const me = await getCurrentAccount();
  if (!me || me.role !== 'admin' || me.member_status !== 'verified') return null;
  return me;
}
