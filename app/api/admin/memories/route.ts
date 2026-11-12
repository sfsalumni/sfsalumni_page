import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { signedMemoryUrl } from '@/lib/memories/sign';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUSES = new Set(['pending', 'published', 'rejected']);

export async function GET(request: Request) {
  try {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const statusParam = new URL(request.url).searchParams.get('status') || 'pending';
    if (!STATUSES.has(statusParam)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('alumni_memories')
      .select(
        'id,title,description,image_url,storage_path,batch_year,batch_label,status,review_note,created_at,submitted_by,reviewed_at'
      )
      .eq('status', statusParam)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('admin memories', error);
      return NextResponse.json({ error: 'Could not load memories queue' }, { status: 500 });
    }

    const submitterIds = [
      ...new Set((data || []).map((r) => r.submitted_by).filter(Boolean) as string[]),
    ];
    const names = new Map<string, string>();
    if (submitterIds.length) {
      const { data: accounts } = await admin
        .from('alumni_accounts')
        .select('id,full_name')
        .in('id', submitterIds);
      for (const a of accounts || []) names.set(a.id, a.full_name);
    }

    const memories = await Promise.all(
      (data || []).map(async (row) => {
        const image_url = await signedMemoryUrl(admin, row.storage_path, row.image_url);
        return {
          ...row,
          image_url,
          submitter_name: row.submitted_by ? names.get(row.submitted_by) || null : null,
        };
      })
    );

    return NextResponse.json({ memories }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('admin memories GET', err);
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 });
  }
}
