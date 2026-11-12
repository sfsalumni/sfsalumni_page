import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import {
  ensureAlumniIdInLegacyUsers,
  isLegacyUsersFkError,
} from '@/lib/stories/legacy-fk-bridge';
import { assertStorySubmit } from '@/lib/stories/validate';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireVerifiedMember() {
  const me = await getCurrentAccount();
  if (!me || me.member_status !== 'verified') return null;
  return me;
}

export async function GET() {
  try {
    const me = await requireVerifiedMember();
    if (!me) return NextResponse.json({ error: 'Sign in as a verified member' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('alumni_stories')
      .select('id,title,body,created_at,status')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('stories list', error);
      return NextResponse.json({ error: 'Could not load stories' }, { status: 500 });
    }

    return NextResponse.json(
      { stories: data || [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('stories GET', err);
    return NextResponse.json({ error: 'Stories API not configured' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const me = await requireVerifiedMember();
    if (!me) return NextResponse.json({ error: 'Sign in as a verified member' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    let parsed;
    try {
      parsed = assertStorySubmit({ title: body.title, body: body.body });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid submission' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const row = {
      author_id: me.id,
      title: parsed.title,
      body: parsed.body,
      status: 'pending' as const,
    };

    let { data, error } = await admin
      .from('alumni_stories')
      .insert(row)
      .select('id,title,status,created_at')
      .single();

    if (isLegacyUsersFkError(error)) {
      try {
        await ensureAlumniIdInLegacyUsers(admin, me);
      } catch (bridgeErr) {
        console.error('stories author bridge', bridgeErr);
        return NextResponse.json({ error: 'Could not submit story' }, { status: 500 });
      }
      ({ data, error } = await admin
        .from('alumni_stories')
        .insert(row)
        .select('id,title,status,created_at')
        .single());
    }

    if (error) {
      console.error('stories insert', error);
      return NextResponse.json({ error: 'Could not submit story' }, { status: 500 });
    }

    return NextResponse.json({ story: data }, { status: 201 });
  } catch (err) {
    console.error('stories POST', err);
    return NextResponse.json({ error: 'Stories API not configured' }, { status: 500 });
  }
}
