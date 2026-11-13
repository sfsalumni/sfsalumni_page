import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { parseBulkRegistrationBody } from '@/lib/admin/bulk-actions';
import {
  applyRegistrationPayment,
  markRegistrationUnpaid,
} from '@/lib/events/mark-paid';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = parseBulkRegistrationBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  let succeeded = 0;
  let failed = 0;

  for (const id of parsed.ids) {
    const result =
      parsed.action === 'mark_paid'
        ? await applyRegistrationPayment({ registrationId: id, settleFull: true })
        : await markRegistrationUnpaid(id);

    if (result.ok) {
      results.push({ id, ok: true });
      succeeded += 1;
    } else {
      results.push({ id, ok: false, error: result.error });
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    action: parsed.action,
    succeeded,
    failed,
    results,
  });
}
