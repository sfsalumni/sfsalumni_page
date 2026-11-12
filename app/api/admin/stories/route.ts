import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
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
      .from('alumni_stories')
      .select('id,title,body,status,review_note,created_at,author_id,reviewed_at')
      .eq('status', statusParam)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('admin stories', error);
      return NextResponse.json({ error: 'Could not load stories queue' }, { status: 500 });
    }

    const authorIds = [...new Set((data || []).map((r) => r.author_id).filter(Boolean) as string[])];
    const names = new Map<string, string>();
    if (authorIds.length) {
      const { data: accounts } = await admin
        .from('alumni_accounts')
        .select('id,full_name')
        .in('id', authorIds);
      for (const a of accounts || []) names.set(a.id, a.full_name);
    }

    const stories = (data || []).map((row) => ({
      ...row,
      author_name: row.author_id ? names.get(row.author_id) || null : null,
    }));

    return NextResponse.json({ stories }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('admin stories GET', err);
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 });
  }
}
