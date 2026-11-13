/** Soft-delete helpers for payment_accounts.deleted_at. */

export function isPaymentAccountSoftDeleted(row: { deleted_at?: string | null }): boolean {
  return Boolean(row.deleted_at);
}

export function softDeletePaymentAccountFields(now: Date = new Date()): {
  deleted_at: string;
  active: false;
  updated_at: string;
} {
  const iso = now.toISOString();
  return { deleted_at: iso, active: false, updated_at: iso };
}

export function restorePaymentAccountFields(now: Date = new Date()): {
  deleted_at: null;
  updated_at: string;
} {
  return { deleted_at: null, updated_at: now.toISOString() };
}
