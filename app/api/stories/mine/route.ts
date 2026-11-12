import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const me = await getCurrentAccount();
    if (!me || me.member_status !== 'verified') {
      return NextResponse.json({ error: 'Sign in as a verified member' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('alumni_stories')
      .select('id,title,body,status,review_note,created_at')
      .eq('author_id', me.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('stories mine', error);
      return NextResponse.json({ error: 'Could not load your stories' }, { status: 500 });
    }

    return NextResponse.json(
      { submissions: data || [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('stories mine GET', err);
    return NextResponse.json({ error: 'Stories API not configured' }, { status: 500 });
  }
}
