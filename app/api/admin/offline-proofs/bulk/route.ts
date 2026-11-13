import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { parseBulkProofBody } from '@/lib/admin/bulk-actions';
import { decideOfflineProof } from '@/lib/admin/decide-offline-proof';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = parseBulkProofBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  let approved = 0;
  let rejected = 0;
  let failed = 0;

  for (const id of parsed.ids) {
    const result = await decideOfflineProof({
      id,
      status: parsed.status,
      adminNote: parsed.adminNote,
      reviewedBy: me.id,
    });
    if (result.ok) {
      results.push({ id, ok: true });
      if (parsed.status === 'approved') approved += 1;
      else rejected += 1;
    } else {
      results.push({ id, ok: false, error: result.error });
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    approved,
    rejected,
    failed,
    results,
  });
}
