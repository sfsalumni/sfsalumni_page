/**
 * Pure payload parsers for admin bulk approve / verify actions.
 * Routes call these before looping single-item decide helpers.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BULK_IDS = 50;

export type BulkProofStatus = 'approved' | 'rejected';
export type BulkRegistrationAction = 'verify' | 'mark_paid' | 'mark_unpaid' | 'unverify';

export type BulkIdsOk = { ok: true; ids: string[] };
export type BulkIdsErr = { ok: false; error: string };

export function parseBulkIds(raw: unknown): BulkIdsOk | BulkIdsErr {
  if (!Array.isArray(raw)) return { ok: false, error: 'ids must be an array' };
  if (raw.length === 0) return { ok: false, error: 'ids must not be empty' };
  if (raw.length > MAX_BULK_IDS) {
    return { ok: false, error: `ids limited to ${MAX_BULK_IDS}` };
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = String(item || '').trim();
    if (!UUID_RE.test(id)) return { ok: false, error: 'each id must be a uuid' };
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  if (ids.length === 0) return { ok: false, error: 'ids must not be empty' };
  return { ok: true, ids };
}

export function parseBulkProofBody(body: unknown):
  | { ok: true; ids: string[]; status: BulkProofStatus; adminNote: string | null }
  | BulkIdsErr {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const idsResult = parseBulkIds(b.ids);
  if (!idsResult.ok) return idsResult;
  const status = String(b.status || '').trim();
  if (status !== 'approved' && status !== 'rejected') {
    return { ok: false, error: 'status must be approved or rejected' };
  }
  const noteRaw = b.adminNote ?? b.admin_note;
  const adminNote =
    noteRaw === undefined || noteRaw === null
      ? null
      : String(noteRaw).trim() || null;
  return { ok: true, ids: idsResult.ids, status, adminNote };
}

export function parseBulkRegistrationBody(body: unknown):
  | { ok: true; ids: string[]; action: BulkRegistrationAction }
  | BulkIdsErr {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const idsResult = parseBulkIds(b.ids);
  if (!idsResult.ok) return idsResult;
  const action = String(b.action || '').trim() as BulkRegistrationAction;
  if (
    action !== 'verify' &&
    action !== 'mark_paid' &&
    action !== 'mark_unpaid' &&
    action !== 'unverify'
  ) {
    return { ok: false, error: 'action must be verify, unverify, mark_paid, or mark_unpaid' };
  }
  return { ok: true, ids: idsResult.ids, action };
}

export { MAX_BULK_IDS };
