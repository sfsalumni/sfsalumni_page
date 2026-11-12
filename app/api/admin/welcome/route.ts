import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { createAdminClient } from '@/lib/supabase-admin';
import { WELCOME_BUCKET, welcomePhotoUrl } from '@/lib/welcome/sign';
import {
  assertWelcomeFields,
  assertWelcomeImage,
  welcomeObjectPath,
} from '@/lib/welcome/validate';

export const dynamic = 'force-dynamic';

const SELECT =
  'id,leadership_label,person_name,person_title,theme,headline,body,quote,signature_name,signature_role,cta_label,cta_href,photo_path,published,created_at,updated_at';

async function rowWithUrl(
  admin: ReturnType<typeof createAdminClient>,
  row: Record<string, unknown> & { photo_path?: string | null }
) {
  return {
    ...row,
    photo_url: await welcomePhotoUrl(admin, row.photo_path),
  };
}

export async function GET() {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('welcome_message')
      .select(SELECT)
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.error('admin welcome get', error);
      return NextResponse.json(
        { error: 'Could not load. Run the welcome_message migration if this is new.' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ message: null });
    }

    return NextResponse.json({ message: await rowWithUrl(admin, data) });
  } catch (err) {
    console.error('admin welcome get', err);
    return NextResponse.json({ error: 'Could not load welcome message' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let fieldsInput: Record<string, unknown>;
    let upload: File | null = null;
    let clearPhoto = false;

    if (isMultipart) {
      const form = await request.formData();
      fieldsInput = {
        leadership_label: form.get('leadership_label'),
        person_name: form.get('person_name'),
        person_title: form.get('person_title'),
        theme: form.get('theme'),
        headline: form.get('headline'),
        body: form.get('body'),
        quote: form.get('quote'),
        signature_name: form.get('signature_name'),
        signature_role: form.get('signature_role'),
        cta_label: form.get('cta_label'),
        cta_href: form.get('cta_href'),
        published: form.get('published'),
      };
      clearPhoto = form.get('clear_photo') === 'true' || form.get('clear_photo') === '1';
      const file = form.get('photo');
      upload =
        file && typeof file === 'object' && 'arrayBuffer' in file && (file as File).size > 0
          ? (file as File)
          : null;
    } else {
      const body = await request.json().catch(() => ({}));
      fieldsInput = body;
      clearPhoto = Boolean(body.clear_photo);
    }

    let fields;
    try {
      fields = assertWelcomeFields(fieldsInput);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid fields' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('welcome_message')
      .select('photo_path')
      .eq('id', 'default')
      .maybeSingle();

    let photo_path: string | null = existing?.photo_path ?? null;

    try {
      if (clearPhoto && !upload) {
        if (photo_path) {
          await admin.storage.from(WELCOME_BUCKET).remove([photo_path]);
        }
        photo_path = null;
      } else if (upload) {
        const ext = assertWelcomeImage({ type: upload.type, size: upload.size }, true);
        const newPath = welcomeObjectPath(ext!);
        const buf = Buffer.from(await upload.arrayBuffer());
        const { error: upErr } = await admin.storage
          .from(WELCOME_BUCKET)
          .upload(newPath, buf, { contentType: upload.type, upsert: true });
        if (upErr) {
          console.error('welcome upload', upErr);
          return NextResponse.json({ error: 'Could not upload photo' }, { status: 500 });
        }
        if (photo_path && photo_path !== newPath) {
          await admin.storage.from(WELCOME_BUCKET).remove([photo_path]);
        }
        photo_path = newPath;
      }
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid photo' },
        { status: 400 }
      );
    }

    const payload = {
      id: 'default',
      ...fields,
      photo_path,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('welcome_message')
      .upsert(payload, { onConflict: 'id' })
      .select(SELECT)
      .single();

    if (error) {
      console.error('admin welcome save', error);
      return NextResponse.json(
        { error: 'Could not save. Run the welcome_message migration if this is new.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: await rowWithUrl(admin, data) });
  } catch (err) {
    console.error('admin welcome save', err);
    return NextResponse.json({ error: 'Could not save welcome message' }, { status: 500 });
  }
}
