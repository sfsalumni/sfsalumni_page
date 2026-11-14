import { NextResponse } from 'next/server';
import { getPortalMenuFlags } from '@/lib/portal-menu/load';

export const dynamic = 'force-dynamic';

/** Public read of which portal nav / home surfaces are enabled. */
export async function GET() {
  try {
    const menu = await getPortalMenuFlags();
    return NextResponse.json({ menu });
  } catch (err) {
    console.error('portal-menu get', err);
    return NextResponse.json({ error: 'Could not load portal menu' }, { status: 500 });
  }
}
