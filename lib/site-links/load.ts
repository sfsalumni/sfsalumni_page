import { createAdminClient } from '@/lib/supabase-admin';
import { publicInstagramLink, type PublicInstagramLink } from '@/lib/site-links/validate';

export type { PublicInstagramLink };

const SELECT = 'instagram_url,instagram_label,published';

/** Published Instagram CTA for the landing hero, or null when hidden. */
export async function getPublicInstagramLink(): Promise<PublicInstagramLink | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('site_links')
      .select(SELECT)
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) return null;
    return publicInstagramLink({
      instagram_url: data.instagram_url,
      instagram_label: data.instagram_label,
      published: Boolean(data.published),
    });
  } catch {
    return null;
  }
}
