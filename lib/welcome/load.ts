import { createAdminClient } from '@/lib/supabase-admin';
import { WELCOME_BUCKET, welcomePhotoUrl } from '@/lib/welcome/sign';

export type PublicWelcome = {
  leadership_label: string;
  person_name: string;
  person_title: string;
  theme: string | null;
  headline: string;
  body: string;
  quote: string | null;
  signature_name: string;
  signature_role: string;
  cta_label: string;
  cta_href: string;
  photo_url: string | null;
};

const SELECT =
  'leadership_label,person_name,person_title,theme,headline,body,quote,signature_name,signature_role,cta_label,cta_href,photo_path,published';

/** Published welcome for the homepage, or null if draft / missing. */
export async function getPublishedWelcome(): Promise<PublicWelcome | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('welcome_message')
      .select(SELECT)
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data || !data.published) return null;

    return {
      leadership_label: data.leadership_label,
      person_name: data.person_name,
      person_title: data.person_title,
      theme: data.theme,
      headline: data.headline,
      body: data.body,
      quote: data.quote,
      signature_name: data.signature_name,
      signature_role: data.signature_role,
      cta_label: data.cta_label,
      cta_href: data.cta_href,
      photo_url: data.photo_path
        ? (await welcomePhotoUrl(admin, data.photo_path)) ||
          admin.storage.from(WELCOME_BUCKET).getPublicUrl(data.photo_path).data.publicUrl ||
          null
        : null,
    };
  } catch {
    return null;
  }
}
