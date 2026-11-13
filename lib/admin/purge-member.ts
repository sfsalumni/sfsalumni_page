import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemberPurgeCounts } from '@/lib/admin/member-purge';

async function countEq(
  admin: SupabaseClient,
  table: string,
  column: string,
  id: string
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, id);
  if (error) {
    console.error(`purge count ${table}`, error);
    return 0;
  }
  return count || 0;
}

export async function loadMemberPurgeCounts(
  admin: SupabaseClient,
  accountId: string
): Promise<MemberPurgeCounts> {
  const [
    registrations,
    donations,
    offline_proofs,
    stories,
    memories,
    push_subscriptions,
  ] = await Promise.all([
    countEq(admin, 'event_registrations', 'account_id', accountId),
    countEq(admin, 'donations', 'account_id', accountId),
    countEq(admin, 'offline_payment_proofs', 'account_id', accountId),
    countEq(admin, 'alumni_stories', 'author_id', accountId),
    countEq(admin, 'alumni_memories', 'submitted_by', accountId),
    countEq(admin, 'push_subscriptions', 'account_id', accountId),
  ]);
  return {
    registrations,
    donations,
    offline_proofs,
    stories,
    memories,
    push_subscriptions,
  };
}

export type PurgeMemberResult =
  | { ok: true; counts: MemberPurgeCounts }
  | { ok: false; status: number; error: string };

export type PurgeRegistrationsResult =
  | { ok: true; deleted_registrations: number; deleted_proofs: number }
  | { ok: false; status: number; error: string };

/**
 * Hard-delete only event registrations (+ their offline proofs) for an account.
 * Leaves the membership, donations, stories, etc.
 */
export async function purgeMemberRegistrations(
  admin: SupabaseClient,
  accountId: string
): Promise<PurgeRegistrationsResult> {
  const { data: regs, error: listErr } = await admin
    .from('event_registrations')
    .select('id')
    .eq('account_id', accountId);
  if (listErr) {
    console.error('purge list registrations', listErr);
    return { ok: false, status: 500, error: 'Could not list registrations' };
  }
  const regIds = (regs || []).map((r) => String(r.id));
  if (regIds.length === 0) {
    return { ok: true, deleted_registrations: 0, deleted_proofs: 0 };
  }

  const { data: proofs, error: proofListErr } = await admin
    .from('offline_payment_proofs')
    .select('id')
    .in('registration_id', regIds);
  if (proofListErr) {
    console.error('purge list reg proofs', proofListErr);
    return { ok: false, status: 500, error: 'Could not list registration proofs' };
  }
  const proofCount = (proofs || []).length;

  const { error: proofErr } = await admin
    .from('offline_payment_proofs')
    .delete()
    .in('registration_id', regIds);
  if (proofErr) {
    console.error('purge reg proofs', proofErr);
    return { ok: false, status: 500, error: 'Could not delete registration proofs' };
  }

  const { error: regErr } = await admin
    .from('event_registrations')
    .delete()
    .eq('account_id', accountId);
  if (regErr) {
    console.error('purge registrations', regErr);
    return { ok: false, status: 500, error: 'Could not delete registrations' };
  }

  return {
    ok: true,
    deleted_registrations: regIds.length,
    deleted_proofs: proofCount,
  };
}

/**
 * Hard-delete a member. Call assertPurgeAllowed + emailsMatchConfirm first.
 * Order respects RESTRICT FKs on offline_payment_proofs and donations.
 */
export async function purgeMemberAccount(
  admin: SupabaseClient,
  accountId: string
): Promise<PurgeMemberResult> {
  const counts = await loadMemberPurgeCounts(admin, accountId);

  const { error: proofErr } = await admin
    .from('offline_payment_proofs')
    .delete()
    .eq('account_id', accountId);
  if (proofErr) {
    console.error('purge proofs', proofErr);
    return { ok: false, status: 500, error: 'Could not delete offline proofs' };
  }

  const { error: donationErr } = await admin
    .from('donations')
    .delete()
    .eq('account_id', accountId);
  if (donationErr) {
    console.error('purge donations', donationErr);
    return { ok: false, status: 500, error: 'Could not delete donations' };
  }

  const { error: reviewedErr } = await admin
    .from('alumni_accounts')
    .update({ reviewed_by: null })
    .eq('reviewed_by', accountId);
  if (reviewedErr) {
    console.error('purge clear reviewed_by', reviewedErr);
    return { ok: false, status: 500, error: 'Could not clear reviewer links' };
  }

  const { error: accountErr } = await admin
    .from('alumni_accounts')
    .delete()
    .eq('id', accountId);
  if (accountErr) {
    console.error('purge account', accountErr);
    return {
      ok: false,
      status: 500,
      error: accountErr.message || 'Could not delete account',
    };
  }

  return { ok: true, counts };
}
