import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * ponytail: alumni_stories still FKs author_id/reviewed_by → public.users until
 * 20261028_alumni_stories_accounts.sql is applied. Table-auth IDs live in
 * alumni_accounts, so we mirror the id into auth.users + public.users for the FK.
 * Remove this helper after that migration is live.
 */
export async function ensureAlumniIdInLegacyUsers(
  admin: SupabaseClient,
  account: { id: string; full_name?: string | null }
): Promise<void> {
  const existing = await admin.from('users').select('id').eq('id', account.id).maybeSingle();
  if (existing.data?.id) return;

  const bridgeEmail = `legacy-bridge-${account.id.replace(/-/g, '')}@sfs.internal`;

  const { error: authErr } = await admin.auth.admin.createUser({
    id: account.id,
    email: bridgeEmail,
    email_confirm: true,
    user_metadata: { bridge: 'alumni_stories_fk' },
  });
  if (authErr && !/already|registered|exists/i.test(authErr.message)) {
    throw authErr;
  }

  const { error: userErr } = await admin.from('users').upsert(
    {
      id: account.id,
      email: bridgeEmail,
      full_name: account.full_name?.trim() || 'Alumni',
      role: 'alumni',
      member_status: 'verified',
    },
    { onConflict: 'id' }
  );
  if (userErr) throw userErr;
}

export function isLegacyUsersFkError(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return false;
  if (error.code !== '23503') return false;
  const blob = `${error.message || ''} ${error.details || ''}`;
  return /alumni_stories_(author_id|reviewed_by)_fkey/i.test(blob) || /\btable "users"\b/i.test(blob);
}
