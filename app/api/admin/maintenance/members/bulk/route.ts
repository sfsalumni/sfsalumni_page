import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import {
  assertPurgeAllowed,
  parseMaintenanceBulkBody,
} from '@/lib/admin/member-purge';
import {
  purgeMemberAccount,
  purgeMemberRegistrations,
} from '@/lib/admin/purge-member';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = parseMaintenanceBulkBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: targets, error } = await admin
    .from('alumni_accounts')
    .select('id,role,full_name,email')
    .in('id', parsed.ids);

  if (error) {
    console.error('maintenance bulk load', error);
    return NextResponse.json({ error: 'Could not load members' }, { status: 500 });
  }

  const byId = new Map((targets || []).map((t) => [String(t.id), t]));
  const results: Array<{
    id: string;
    ok: boolean;
    skipped?: boolean;
    error?: string;
  }> = [];
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const id of parsed.ids) {
    const target = byId.get(id);
    if (!target) {
      results.push({ id, ok: false, error: 'Member not found' });
      failed += 1;
      continue;
    }

    if (parsed.scope === 'membership') {
      const guard = assertPurgeAllowed({
        actorId: me.id,
        targetId: target.id,
        targetRole: target.role,
      });
      if (!guard.ok) {
        results.push({ id, ok: false, skipped: true, error: guard.error });
        skipped += 1;
        continue;
      }
      const result = await purgeMemberAccount(admin, id);
      if (result.ok) {
        results.push({ id, ok: true });
        succeeded += 1;
      } else {
        results.push({ id, ok: false, error: result.error });
        failed += 1;
      }
      continue;
    }

    // registrations scope — allowed for admins and self
    const result = await purgeMemberRegistrations(admin, id);
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
    scope: parsed.scope,
    succeeded,
    skipped,
    failed,
    results,
  });
}
