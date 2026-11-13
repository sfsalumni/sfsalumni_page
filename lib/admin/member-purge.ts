/**
 * Guards + confirm helpers for hard-deleting an alumni member and related rows.
 * DB wipe lives in purgeMemberAccount() (needs admin client).
 */

export type PurgeGuardInput = {
  actorId: string;
  targetId: string;
  targetRole: string | null | undefined;
};

export type PurgeGuardOk = { ok: true };
export type PurgeGuardErr = { ok: false; error: string };

export function assertPurgeAllowed(input: PurgeGuardInput): PurgeGuardOk | PurgeGuardErr {
  const actorId = String(input.actorId || '').trim();
  const targetId = String(input.targetId || '').trim();
  if (!actorId || !targetId) {
    return { ok: false, error: 'Missing account id' };
  }
  if (actorId === targetId) {
    return { ok: false, error: 'You cannot delete your own account' };
  }
  if (String(input.targetRole || '').trim() === 'admin') {
    return { ok: false, error: 'Demote the admin to alumni before deleting' };
  }
  return { ok: true };
}

/** Typed confirmation must match the account email (case-insensitive, trimmed). */
export function emailsMatchConfirm(accountEmail: string, typed: string): boolean {
  return (
    String(accountEmail || '').trim().toLowerCase() ===
    String(typed || '').trim().toLowerCase()
  );
}

export type MemberPurgeCounts = {
  registrations: number;
  donations: number;
  offline_proofs: number;
  stories: number;
  memories: number;
  push_subscriptions: number;
};
