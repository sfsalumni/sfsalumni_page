/** Maps Supabase/Postgres delete errors to an admin-facing message. */
export function donationCauseDeleteMessage(
  error: { code?: string; message?: string } | null | undefined
): string {
  if (error?.code === '23503') {
    return 'This type has donation history. Turn Active off instead of deleting.';
  }
  return 'Could not delete donation type';
}
