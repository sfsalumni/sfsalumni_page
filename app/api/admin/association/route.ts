import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { assertAssociationAboutFields } from '@/lib/association/validate';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const SELECT =
  'id,eyebrow,title,purpose_heading,purpose_body,purpose_note,cta_label,cta_href,highlight_eyebrow,highlight_title,highlight_body,published,created_at,updated_at';

export async function GET() {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('association_about')
      .select(SELECT)
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.error('admin association get', error);
      return NextResponse.json(
        { error: 'Could not load. Run the association_about migration if this is new.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: data ?? null });
  } catch (err) {
    console.error('admin association get', err);
    return NextResponse.json({ error: 'Could not load association about' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    let fields;
    try {
      fields = assertAssociationAboutFields(body);
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
      .from('association_about')
      .upsert(payload, { onConflict: 'id' })
      .select(SELECT)
      .single();

    if (error) {
      console.error('admin association save', error);
      return NextResponse.json(
        { error: 'Could not save. Run the association_about migration if this is new.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: data });
  } catch (err) {
    console.error('admin association save', err);
    return NextResponse.json({ error: 'Could not save association about' }, { status: 500 });
  }
}
