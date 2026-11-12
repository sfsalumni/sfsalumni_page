import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'alumni-memories';
const TTL_SEC = 3600;

export async function signedMemoryUrl(
  admin: SupabaseClient,
  storagePath: string | null | undefined,
  fallbackUrl?: string | null
): Promise<string | null> {
  if (storagePath) {
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, TTL_SEC);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return fallbackUrl || null;
}

export { BUCKET as MEMORIES_BUCKET };
