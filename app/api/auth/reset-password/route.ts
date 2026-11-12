import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/password';
import { hashResetToken } from '@/lib/auth/reset-token';
import { COOKIE_NAME, createSessionToken, sessionCookieOptions } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const password = String(body.password || '');
    const confirm = String(body.confirm || body.password_confirm || '');

    if (!token) {
      return NextResponse.json({ error: 'Reset link is invalid or expired' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    if (password !== confirm) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const admin = createAdminClient();
    const token_hash = hashResetToken(token);
    const { data: row, error: findErr } = await admin
      .from('password_reset_tokens')
      .select('id,account_id,expires_at,used_at')
      .eq('token_hash', token_hash)
      .maybeSingle();

    if (findErr) {
      console.error('reset-password lookup', findErr);
      return NextResponse.json({ error: 'Could not reset password' }, { status: 500 });
    }
    if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Reset link is invalid or expired' },
        { status: 400 }
      );
    }

    const password_hash = await hashPassword(password);
    const { data: account, error: updErr } = await admin
      .from('alumni_accounts')
      .update({ password_hash })
      .eq('id', row.account_id)
      .select('id,email')
      .single();

    if (updErr || !account) {
      console.error('reset-password update', updErr);
      return NextResponse.json({ error: 'Could not reset password' }, { status: 500 });
    }

    await admin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id);

    const session = await createSessionToken({
      accountId: account.id,
      email: account.email,
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, session, sessionCookieOptions);
    return res;
  } catch (err) {
    console.error('reset-password', err);
    return NextResponse.json({ error: 'Could not reset password' }, { status: 500 });
  }
}
