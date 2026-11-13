import { NextResponse } from 'next/server';
import { getPublicInstagramLink } from '@/lib/site-links/load';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const instagram = await getPublicInstagramLink();
  return NextResponse.json(
    { instagram },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
