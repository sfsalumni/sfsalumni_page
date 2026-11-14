/**
 * Pending Bank / UPI proof helpers shared by submit + registration lock paths.
 * Pure display helpers live here so scripts/check-bank-details.mjs can assert them without DB.
 */

export type PendingOfflineProof = {
  id: string;
  utr: string | null;
  screenshot_path: string | null;
  status: 'pending';
};

/** Bank reference column value used for admin “awaiting verification” when only a screenshot exists. */
export const SCREENSHOT_BANK_REFERENCE = 'Screenshot on file';

/** Member-facing message when guest/food/donation edits are blocked. */
export const PENDING_PROOF_LOCK_MESSAGE =
  'Your Bank / UPI proof is pending committee review. Guest count, food choice, and donation cannot be changed until it is reviewed.';

/** Member-facing message when another proof submit is blocked. */
export const PENDING_PROOF_ALREADY_MESSAGE =
  'A Bank / UPI proof is already pending review. Wait for the committee, or contact them if you need to change the reference.';

/** Nav / chip / pass CTA when money is still due. */
export function pendingPaymentMemberLabel(proofPending: boolean): string {
  return proofPending ? 'Awaiting confirmation' : 'Complete payment';
}

/** Registration page H1 — never say “Complete payment” while proof awaits review. */
export function registrationFormHeading(input: {
  formMode: 'new' | 'pay' | 'update';
  verificationPending: boolean;
}): string {
  if (input.verificationPending) return 'Awaiting confirmation';
  if (input.formMode === 'update') return 'Update registration';
  if (input.formMode === 'pay') return 'Complete payment';
  return 'Event Registration';
}

/**
 * My home venue-pass payment strip. Proof submitted (pending row or bank ref) is
 * “awaiting confirmation”, not “Complete payment”.
 */
export function venuePassPaymentCue(input: {
  confirmed: boolean;
  dueLabel: string;
  pendingOfflineProof: boolean;
  bankReference?: string | null;
}): {
  awaiting: boolean;
  badge: string;
  message: string;
  ctaLabel: string;
} | null {
  if (input.confirmed) return null;
  const awaiting =
    input.pendingOfflineProof || Boolean(String(input.bankReference ?? '').trim());
  if (awaiting) {
    return {
      awaiting: true,
      badge: 'Awaiting confirmation',
      message:
        'Your payment is with the committee. The entry pass QR unlocks once they confirm.',
      ctaLabel: 'View registration',
    };
  }
  return {
    awaiting: false,
    badge: input.dueLabel,
    message: 'Complete payment to unlock your entry pass QR.',
    ctaLabel: pendingPaymentMemberLabel(false),
  };
}

export function bankReferenceFromProof(input: {
  utr: string | null;
  hasScreenshot: boolean;
}): string {
  const utr = String(input.utr ?? '').trim();
  if (utr) return utr;
  if (input.hasScreenshot) return SCREENSHOT_BANK_REFERENCE;
  throw new Error('Add a UTR reference or a payment screenshot');
}

export function verificationStatusLabel(input: {
  paymentStatus: string | null | undefined;
  pendingProof: boolean;
  bankReference: string | null | undefined;
}): string {
  if (input.paymentStatus === 'paid') return 'paid';
  if (input.pendingProof || Boolean(String(input.bankReference ?? '').trim())) {
    return 'pending verification';
  }
  return 'not submitted';
}

export function pendingProofDisplay(proof: {
  utr: string | null;
  screenshot_path: string | null;
}): { utr: string; hasScreenshot: boolean; label: string } {
  const utr = String(proof.utr ?? '').trim();
  const hasScreenshot = Boolean(proof.screenshot_path);
  const label = utr
    ? hasScreenshot
      ? `UTR ${utr} · screenshot on file · pending verification`
      : `UTR ${utr} · pending verification`
    : hasScreenshot
      ? 'Screenshot on file · pending verification'
      : 'Pending verification';
  return { utr, hasScreenshot, label };
}
