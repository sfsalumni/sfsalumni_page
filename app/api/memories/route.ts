import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import { memoryObjectPath } from '@/lib/memories/paths';
import { partitionPublishedMemories } from '@/lib/memories/partition';
import { MEMORIES_BUCKET, signedMemoryUrl } from '@/lib/memories/sign';
import { assertMemoryUpload } from '@/lib/memories/validate';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SELECT =
  'id,title,description,image_url,storage_path,batch_year,batch_label,created_at,status';

async function requireVerifiedMember() {
  const me = await getCurrentAccount();
  if (!me || me.member_status !== 'verified') return null;
  return me;
}

async function withSignedUrls(
  admin: ReturnType<typeof createAdminClient>,
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  return Promise.all(
    rows.map(async (row) => {
      const image_url = await signedMemoryUrl(
        admin,
        row.storage_path as string | null,
        row.image_url as string | null
      );
      return { ...row, image_url };
    })
  );
}

export async function GET() {
  try {
    const me = await requireVerifiedMember();
    if (!me) return NextResponse.json({ error: 'Sign in as a verified member' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('alumni_memories')
      .select(SELECT)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('memories list', error);
      return NextResponse.json({ error: 'Could not load memories' }, { status: 500 });
    }

    const rows = (data || []) as Record<string, unknown>[];
    const signed = await withSignedUrls(admin, rows);
    const mapped = signed.map((r) => ({
      id: String(r.id),
      title: String(r.title || ''),
      description: (r.description as string | null) ?? null,
      image_url: (r.image_url as string | null) ?? null,
      batch_year:
        typeof r.batch_year === 'number'
          ? r.batch_year
          : r.batch_year != null
            ? Number(r.batch_year) || null
            : null,
      batch_label: (r.batch_label as string | null) ?? null,
      created_at: String(r.created_at || ''),
    }));
    const partitioned = partitionPublishedMemories(mapped, me.batch);

    return NextResponse.json(partitioned, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('memories GET', err);
    return NextResponse.json({ error: 'Memories API not configured' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const me = await requireVerifiedMember();
    if (!me) return NextResponse.json({ error: 'Sign in as a verified member' }, { status: 401 });

    const contentLength = Number(request.headers.get('content-length') || 0);
    // Multipart overhead; reject early when clearly over ~4 MB image + fields.
    if (contentLength > 4_500_000) {
      return NextResponse.json({ error: 'Image must be 4 MB or smaller' }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get('image');
    const blob = file instanceof File ? file : null;

    let parsed;
    try {
      parsed = assertMemoryUpload({
        title: form.get('title'),
        description: form.get('description'),
        consent: form.get('consent'),
        batchYearRaw: form.has('batch_year') ? form.get('batch_year') : undefined,
        file: blob
          ? { name: blob.name, type: blob.type, size: blob.size }
          : null,
        defaultBatchYear: me.batch,
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid submission' },
        { status: 400 }
      );
    }

    if (!blob) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const objectId = randomUUID();
    const storagePath = memoryObjectPath(parsed.batchYear, objectId, parsed.ext);
    const admin = createAdminClient();
    const buffer = Buffer.from(await blob.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(MEMORIES_BUCKET)
      .upload(storagePath, buffer, { contentType: blob.type, upsert: false });

    if (uploadError) {
      console.error('memories upload', uploadError);
      return NextResponse.json({ error: 'Could not upload image' }, { status: 500 });
    }

    const batchLabel =
      parsed.batchYear != null ? String(parsed.batchYear) : 'General';

    const { data: inserted, error: insertError } = await admin
      .from('alumni_memories')
      .insert({
        id: objectId,
        title: parsed.title,
        description: parsed.description,
        storage_path: storagePath,
        batch_year: parsed.batchYear,
        batch_label: batchLabel,
        consent_confirmed: true,
        status: 'pending',
        submitted_by: me.id,
      })
      .select(SELECT)
      .maybeSingle();

    if (insertError) {
      console.error('memories insert', insertError);
      await admin.storage.from(MEMORIES_BUCKET).remove([storagePath]).catch(() => undefined);
      return NextResponse.json({ error: 'Could not save memory' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, memory: inserted }, { status: 201 });
  } catch (err) {
    console.error('memories POST', err);
    return NextResponse.json({ error: 'Memories API not configured' }, { status: 500 });
  }
}
