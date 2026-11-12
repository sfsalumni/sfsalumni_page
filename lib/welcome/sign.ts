import type { SupabaseClient } from '@supabase/supabase-js';

export const WELCOME_BUCKET = 'welcome-photos';
const TTL_SEC = 3600 * 24;

export async function welcomePhotoUrl(
  admin: SupabaseClient,
  storagePath: string | null | undefined
): Promise<string | null> {
  if (!storagePath) return null;
  const { data: pub } = admin.storage.from(WELCOME_BUCKET).getPublicUrl(storagePath);
  if (pub?.publicUrl) return pub.publicUrl;
  const { data, error } = await admin.storage
    .from(WELCOME_BUCKET)
    .createSignedUrl(storagePath, TTL_SEC);
  if (!error && data?.signedUrl) return data.signedUrl;
  return null;
}
