import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import { signedMemoryUrl } from '@/lib/memories/sign';
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
      .from('alumni_memories')
      .select(
        'id,title,description,image_url,storage_path,batch_year,batch_label,status,review_note,created_at'
      )
      .eq('submitted_by', me.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('memories mine', error);
      return NextResponse.json({ error: 'Could not load your submissions' }, { status: 500 });
    }

    const rows = await Promise.all(
      (data || []).map(async (row) => {
        const image_url = await signedMemoryUrl(admin, row.storage_path, row.image_url);
        return { ...row, image_url };
      })
    );

    return NextResponse.json({ submissions: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('memories mine GET', err);
    return NextResponse.json({ error: 'Memories API not configured' }, { status: 500 });
  }
}
