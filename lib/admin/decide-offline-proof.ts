import { applyDonationPayment } from '@/lib/donations/mark-paid';
import { applyRegistrationPayment } from '@/lib/events/mark-paid';
import { createAdminClient } from '@/lib/supabase-admin';

export type DecideOfflineProofResult =
  | { ok: true; proof: { id: string; status: string; admin_note: string | null; reviewed_at: string | null } }
  | { ok: false; status: number; error: string };

/** Approve or reject one pending offline proof. Shared by single + bulk admin routes. */
export async function decideOfflineProof(input: {
  id: string;
  status: 'approved' | 'rejected';
  adminNote: string | null;
  reviewedBy: string;
}): Promise<DecideOfflineProofResult> {
  const admin = createAdminClient();
  const { data: proof, error } = await admin
    .from('offline_payment_proofs')
    .select('id,source_type,registration_id,donation_id,amount_paise,status')
    .eq('id', input.id)
    .maybeSingle();

  if (error || !proof) {
    return { ok: false, status: 404, error: 'Proof not found' };
  }
  if (proof.status !== 'pending') {
    return { ok: false, status: 400, error: 'Proof already reviewed' };
  }

  if (input.status === 'approved') {
    if (proof.source_type === 'registration' && proof.registration_id) {
      const result = await applyRegistrationPayment({
        registrationId: proof.registration_id,
        settleFull: true,
      });
      if (!result.ok) {
        return {
          ok: false,
          status: result.status || 500,
          error: result.error || 'Could not mark registration paid',
        };
      }
    } else if (proof.source_type === 'donation' && proof.donation_id) {
      const result = await applyDonationPayment({ donationId: proof.donation_id });
      if (!result.ok) {
        return {
          ok: false,
          status: result.status || 500,
          error: result.error || 'Could not mark donation paid',
        };
      }
    } else {
      return { ok: false, status: 400, error: 'Proof missing source link' };
    }
  }

  const { data: updated, error: updErr } = await admin
    .from('offline_payment_proofs')
    .update({
      status: input.status,
      admin_note: input.adminNote,
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('id,status,admin_note,reviewed_at')
    .maybeSingle();

  if (updErr || !updated) {
    console.error('offline proof decide', updErr);
    return { ok: false, status: 500, error: 'Could not update proof' };
  }

  return { ok: true, proof: updated };
}
