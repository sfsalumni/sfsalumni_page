import { NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import {
  assertPurgeAllowed,
  emailsMatchConfirm,
} from '@/lib/admin/member-purge';
import { loadMemberPurgeCounts, purgeMemberAccount } from '@/lib/admin/purge-member';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadTarget(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data, error } = await admin
    .from('alumni_accounts')
    .select('id,full_name,email,username,batch,role,member_status,created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('maintenance member load', error);
    return null;
  }
  return data;
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const target = await loadTarget(admin, id);
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const counts = await loadMemberPurgeCounts(admin, id);
  const guard = assertPurgeAllowed({
    actorId: me.id,
    targetId: target.id,
    targetRole: target.role,
  });

  return NextResponse.json({
    member: target,
    counts,
    can_delete: guard.ok,
    block_reason: guard.ok ? null : guard.error,
  });
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const me = await requireVerifiedAdmin();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const confirmEmail = String(body.confirmEmail ?? body.confirm_email ?? '');

  const admin = createAdminClient();
  const target = await loadTarget(admin, id);
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const guard = assertPurgeAllowed({
    actorId: me.id,
    targetId: target.id,
    targetRole: target.role,
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 400 });
  }

  if (!emailsMatchConfirm(target.email, confirmEmail)) {
    return NextResponse.json(
      { error: 'Type the member email exactly to confirm deletion' },
      { status: 400 }
    );
  }

  const result = await purgeMemberAccount(admin, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    deleted: {
      id: target.id,
      email: target.email,
      full_name: target.full_name,
    },
    counts: result.counts,
  });
}
