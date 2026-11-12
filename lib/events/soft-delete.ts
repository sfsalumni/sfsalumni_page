/** Soft-delete helpers for event_catalog.deleted_at. */

export function isEventSoftDeleted(event: { deleted_at?: string | null }): boolean {
  return Boolean(event.deleted_at);
}

export function softDeleteFields(now: Date = new Date()): {
  deleted_at: string;
  is_primary: false;
  updated_at: string;
} {
  const iso = now.toISOString();
  return { deleted_at: iso, is_primary: false, updated_at: iso };
}

export function restoreFields(now: Date = new Date()): {
  deleted_at: null;
  updated_at: string;
} {
  return { deleted_at: null, updated_at: now.toISOString() };
}
