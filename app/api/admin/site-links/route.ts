import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { assertSiteLinksFields } from '@/lib/site-links/validate';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const SELECT = 'id,instagram_url,instagram_label,published,created_at,updated_at';

export async function GET() {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('site_links')
      .select(SELECT)
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.error('admin site-links get', error);
      return NextResponse.json(
        { error: 'Could not load. Run the site_links migration if this is new.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: data ?? null });
  } catch (err) {
    console.error('admin site-links get', err);
    return NextResponse.json({ error: 'Could not load site links' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    let fields;
    try {
      fields = assertSiteLinksFields(body);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid fields' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const payload = {
      id: 'default',
      ...fields,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('site_links')
      .upsert(payload, { onConflict: 'id' })
      .select(SELECT)
      .single();

    if (error) {
      console.error('admin site-links save', error);
      return NextResponse.json(
        { error: 'Could not save. Run the site_links migration if this is new.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: data });
  } catch (err) {
    console.error('admin site-links save', err);
    return NextResponse.json({ error: 'Could not save site links' }, { status: 500 });
  }
}
