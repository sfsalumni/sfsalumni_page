import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';
import {
  getAccountRegistrationForEvent,
  registerAccountForEvent,
} from '@/lib/events/register';

export async function GET(request: Request) {
  try {
    const me = await getCurrentAccount();
    if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    const eventId = new URL(request.url).searchParams.get('eventId') || '';
    const result = await getAccountRegistrationForEvent(me, eventId);
    return NextResponse.json(result.payload, { status: result.status });
  } catch (err) {
    console.error('registration event get', err);
    return NextResponse.json({ error: 'Registration API not configured' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const me = await getCurrentAccount();
    if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const result = await registerAccountForEvent(me, body as Record<string, unknown>);
    return NextResponse.json(result.payload, { status: result.status });
  } catch (err) {
    console.error('registration event', err);
    return NextResponse.json({ error: 'Registration API not configured' }, { status: 500 });
  }
}
