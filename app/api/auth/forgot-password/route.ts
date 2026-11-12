import { NextResponse } from 'next/server';
import { appOrigin } from '@/lib/auth/app-origin';
import { normalizeEmail } from '@/lib/email';
import {
  createResetTokenPlain,
  hashResetToken,
  resetExpiresAt,
} from '@/lib/auth/reset-token';
import { sendPasswordResetEmail } from '@/lib/auth/send-reset-email';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const GENERIC = {
  ok: true,
  message: 'If that email is registered, we sent a reset link. Check your inbox.',
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(String(body.email || ''));
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: account, error: findErr } = await admin
      .from('alumni_accounts')
      .select('id,email')
      .eq('email', email)
      .maybeSingle();

    if (findErr) {
      console.error('forgot-password lookup', findErr);
      return NextResponse.json({ error: 'Could not process request' }, { status: 500 });
    }

    if (!account) {
      return NextResponse.json(GENERIC);
    }

    const plain = createResetTokenPlain();
    const token_hash = hashResetToken(plain);
    const expires_at = resetExpiresAt().toISOString();

    // Invalidate prior unused tokens for this account
    await admin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('account_id', account.id)
      .is('used_at', null);

    const { error: insertErr } = await admin.from('password_reset_tokens').insert({
      account_id: account.id,
      token_hash,
      expires_at,
    });

    if (insertErr) {
      console.error('forgot-password insert', insertErr);
      return NextResponse.json(
        {
          error:
            'Password reset is not configured yet. Apply the password_reset_tokens migration.',
        },
        { status: 500 }
      );
    }

    try {
      await sendPasswordResetEmail(account.email, plain);
    } catch (mailErr) {
      console.error('forgot-password mail', mailErr);
      return NextResponse.json({ error: 'Could not send reset email' }, { status: 500 });
    }

    const payload: Record<string, unknown> = { ...GENERIC };
    // Local/dev convenience when Resend is unset
    if (!process.env.RESEND_API_KEY?.trim() && process.env.NODE_ENV !== 'production') {
      payload.devResetUrl = `${appOrigin()}/reset-password/${encodeURIComponent(plain)}`;
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('forgot-password', err);
    return NextResponse.json({ error: 'Could not process request' }, { status: 500 });
  }
}
