import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import { getPrimaryEventId } from '@/lib/events/primary';
import { registerAccountForEvent } from '@/lib/events/register';

/** Thin wrap: register against the primary (Jubilee) event. */
export async function POST(request: Request) {
  try {
    const me = await getCurrentAccount();
    if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const eventId = await getPrimaryEventId();
    if (!eventId) {
      return NextResponse.json(
        { error: 'No primary event configured. Apply the event_catalog migration.' },
        { status: 500 }
      );
    }

    const incoming = await request.json().catch(() => ({}));
    const result = await registerAccountForEvent(me, {
      ...(incoming as Record<string, unknown>),
      eventId,
    });
    return NextResponse.json(result.payload, { status: result.status });
  } catch (err) {
    console.error('jubilee registration', err);
    return NextResponse.json({ error: 'Registration API not configured' }, { status: 500 });
  }
}
