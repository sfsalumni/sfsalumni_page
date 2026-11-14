import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { getPortalMenuFlags } from '@/lib/portal-menu/load';
import { assertPortalMenuFields } from '@/lib/portal-menu/menu';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const SELECT =
  'id,show_donate,show_stories,show_memories,show_submissions,show_home_lanes,updated_at';

export async function GET() {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const menu = await getPortalMenuFlags();
    return NextResponse.json({ menu });
  } catch (err) {
    console.error('admin portal-menu get', err);
    return NextResponse.json({ error: 'Could not load portal menu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const fields = assertPortalMenuFields(body);
    const admin = createAdminClient();
    const payload = {
      id: 'default',
      ...fields,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('portal_menu')
      .upsert(payload, { onConflict: 'id' })
      .select(SELECT)
      .single();

    if (error) {
      console.error('admin portal-menu save', error);
      return NextResponse.json(
        {
          error:
            'Could not save. Run migration 20261114080000_portal_menu.sql in Supabase if this is new.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ menu: assertPortalMenuFields(data) });
  } catch (err) {
    console.error('admin portal-menu save', err);
    return NextResponse.json({ error: 'Could not save portal menu' }, { status: 500 });
  }
}
