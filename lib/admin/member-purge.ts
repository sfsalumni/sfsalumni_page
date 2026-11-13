/**
 * Guards + confirm helpers for hard-deleting an alumni member and related rows.
 * DB wipe lives in purge-member.ts (needs admin client).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PurgeGuardInput = {
  actorId: string;
  targetId: string;
  targetRole: string | null | undefined;
};

export type PurgeGuardOk = { ok: true };
export type PurgeGuardErr = { ok: false; error: string };

export type MaintenanceBulkScope = 'registrations' | 'membership';

export const MAINTENANCE_BULK_CONFIRM = 'DELETE';
export const MAX_MAINTENANCE_BULK_IDS = 100;

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

export function deleteConfirmMatches(typed: string): boolean {
  return String(typed || '').trim() === MAINTENANCE_BULK_CONFIRM;
}

export function parseMaintenanceBulkBody(body: unknown):
  | { ok: true; ids: string[]; scope: MaintenanceBulkScope }
  | PurgeGuardErr {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (!deleteConfirmMatches(String(b.confirm ?? ''))) {
    return { ok: false, error: `Type ${MAINTENANCE_BULK_CONFIRM} to confirm` };
  }
  if (!Array.isArray(b.ids)) return { ok: false, error: 'ids must be an array' };
  if (b.ids.length === 0) return { ok: false, error: 'ids must not be empty' };
  if (b.ids.length > MAX_MAINTENANCE_BULK_IDS) {
    return { ok: false, error: `ids limited to ${MAX_MAINTENANCE_BULK_IDS}` };
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of b.ids) {
    const id = String(item || '').trim();
    if (!UUID_RE.test(id)) return { ok: false, error: 'each id must be a uuid' };
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  if (ids.length === 0) return { ok: false, error: 'ids must not be empty' };
  const scope = String(b.scope || '').trim() as MaintenanceBulkScope;
  if (scope !== 'registrations' && scope !== 'membership') {
    return { ok: false, error: 'scope must be registrations or membership' };
  }
  return { ok: true, ids, scope };
}

export type MemberPurgeCounts = {
  registrations: number;
  donations: number;
  offline_proofs: number;
  stories: number;
  memories: number;
  push_subscriptions: number;
};
