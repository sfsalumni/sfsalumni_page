import {
  ASSOCIATION_ABOUT_FALLBACK,
  type PublicAssociationAbout,
} from '@/lib/association/fallback';
import { createAdminClient } from '@/lib/supabase-admin';

export type { PublicAssociationAbout };

const SELECT =
  'eyebrow,title,purpose_heading,purpose_body,purpose_note,cta_label,cta_href,highlight_eyebrow,highlight_title,highlight_body,published';

/** Published about-association copy, or the static fallback when draft / missing. */
export async function getAssociationAbout(): Promise<PublicAssociationAbout> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('association_about')
      .select(SELECT)
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data || !data.published) return ASSOCIATION_ABOUT_FALLBACK;

    return {
      eyebrow: data.eyebrow,
      title: data.title,
      purpose_heading: data.purpose_heading,
      purpose_body: data.purpose_body,
      purpose_note: data.purpose_note,
      cta_label: data.cta_label,
      cta_href: data.cta_href,
      highlight_eyebrow: data.highlight_eyebrow,
      highlight_title: data.highlight_title,
      highlight_body: data.highlight_body,
    };
  } catch {
    return ASSOCIATION_ABOUT_FALLBACK;
  }
}
