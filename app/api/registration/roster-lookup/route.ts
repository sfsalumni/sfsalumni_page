import { NextResponse } from 'next/server';
import { hitRateLimit } from '@/lib/auth/recover-rate-limit';
import { getCurrentAccount } from '@/lib/auth/request';
import { assertRosterLookupQuery } from '@/lib/registration/roster';
import { lookupMemberRoster } from '@/lib/registration/roster-lookup';

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function GET(request: Request) {
  try {
    const me = await getCurrentAccount();
    const url = new URL(request.url);
    const phoneParam = url.searchParams.get('phone');
    const emailParam = url.searchParams.get('email');
    const nameParam = url.searchParams.get('name');

    const phone = phoneParam ?? (me?.phone_number || '');
    const email = emailParam ?? (me?.email || '');
    const name = nameParam ?? (me?.full_name || '');

    // Unsigned callers must send phone or email (no name-only scrape).
    if (!me) {
      const gate = assertRosterLookupQuery({ phone, email, name });
      if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: 400 });
      }
      if (hitRateLimit(`roster-lookup:${clientIp(request)}`, 30, 15 * 60 * 1000)) {
        return NextResponse.json({ error: 'Too many lookups. Try again later.' }, { status: 429 });
      }
    }

    const result = await lookupMemberRoster({ phone, email, name });
    return NextResponse.json({
      kind: result.kind,
      matches: result.matches,
      auto: result.kind === 'exact' && result.matches.length === 1,
    });
  } catch (err) {
    console.error('roster lookup', err);
    return NextResponse.json({ error: 'Could not look up member roster' }, { status: 500 });
  }
}
