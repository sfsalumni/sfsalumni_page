import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import { filterDirectoryRows, type DirectoryAlum } from '@/lib/directory/search';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const me = await getCurrentAccount();
    if (!me || me.member_status !== 'verified') {
      return NextResponse.json({ error: 'Sign in as a verified member' }, { status: 401 });
    }

    const url = new URL(request.url);
    const q = String(url.searchParams.get('q') || '');
    const batchRaw = url.searchParams.get('batch');
    const batch =
      batchRaw != null && batchRaw.trim() !== '' && Number.isFinite(Number(batchRaw))
        ? Number(batchRaw)
        : null;

    const admin = createAdminClient();
    // ponytail: try username column first; fall back if migration not applied.
    let data: Record<string, unknown>[] | null = null;
    let error: { message?: string } | null = null;
    {
      const full = await admin
        .from('alumni_accounts')
        .select(
          'id,full_name,batch,username,email,current_location,profession,role,profile_visibility,member_status'
        )
        .eq('member_status', 'verified')
        .eq('profile_visibility', true)
        .neq('role', 'admin')
        .order('full_name', { ascending: true })
        .limit(200);
      if (!full.error) {
        data = (full.data || []) as Record<string, unknown>[];
      } else {
        const core = await admin
          .from('alumni_accounts')
          .select(
            'id,full_name,batch,email,current_location,profession,role,profile_visibility,member_status'
          )
          .eq('member_status', 'verified')
          .eq('profile_visibility', true)
          .neq('role', 'admin')
          .order('full_name', { ascending: true })
          .limit(200);
        data = (core.data || []) as Record<string, unknown>[];
        error = core.error;
      }
    }

    if (error) {
      console.error('directory', error);
      return NextResponse.json(
        { error: 'Directory is not available yet. Check alumni_accounts access.' },
        { status: 503 }
      );
    }

    const rows: DirectoryAlum[] = (data || []).map((r) => {
      const usernameRaw = r.username != null ? String(r.username).trim() : '';
      const emailRaw = r.email != null ? String(r.email).trim() : '';
      return {
        id: String(r.id),
        full_name: String(r.full_name || ''),
        batch: typeof r.batch === 'number' ? r.batch : r.batch != null ? Number(r.batch) || null : null,
        username: usernameRaw || emailRaw || null,
        current_location: r.current_location != null ? String(r.current_location) : null,
        profession: r.profession != null ? String(r.profession) : null,
      };
    });

    const alumni = filterDirectoryRows(rows, { q, batch });
    return NextResponse.json({ alumni }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('directory GET', err);
    return NextResponse.json({ error: 'Directory API not configured' }, { status: 500 });
  }
}
