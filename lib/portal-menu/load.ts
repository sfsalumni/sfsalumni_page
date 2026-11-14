import { createAdminClient } from '@/lib/supabase-admin';
import {
  assertPortalMenuFields,
  DAY1_PORTAL_MENU,
  type PortalMenuFlags,
} from '@/lib/portal-menu/menu';

const SELECT =
  'show_donate,show_stories,show_memories,show_submissions,show_home_lanes';

/** Load portal menu flags; Day-1 defaults if the table is missing or empty. */
export async function getPortalMenuFlags(): Promise<PortalMenuFlags> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('portal_menu')
      .select(SELECT)
      .eq('id', 'default')
      .maybeSingle();
    if (error || !data) return { ...DAY1_PORTAL_MENU };
    return assertPortalMenuFields(data);
  } catch {
    return { ...DAY1_PORTAL_MENU };
  }
}
