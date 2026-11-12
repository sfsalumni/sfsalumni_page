import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/request';

export async function GET() {
  try {
    const account = await getCurrentAccount();
    if (!account) {
      return NextResponse.json(
        { error: 'Not signed in' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(account, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('me', err);
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }
}
