export type JubileeRegStatus = 'none' | 'pending_payment' | 'paid';

export type JubileeAccountHint = {
  role: 'alumni' | 'admin';
  jubilee_reg_status?: JubileeRegStatus | null;
  /** True when a Bank / UPI proof is awaiting committee review. */
  payment_proof_pending?: boolean | null;
};

export type JubileeCta = {
  /** Show a primary registration-related CTA */
  show: boolean;
  href: string;
  label: string;
};

function pendingPaymentLabel(proofPending: boolean | null | undefined): string {
  // Keep in sync with pendingPaymentMemberLabel in lib/payments/offline-proof.ts
  return proofPending ? 'Awaiting confirmation' : 'Complete payment';
}

export function jubileeCta(account: JubileeAccountHint | null | undefined): JubileeCta {
  if (!account) {
    return { show: true, href: '/registration', label: 'Register for Alumni Meet' };
  }
  if (account.role === 'admin') {
    return { show: false, href: '/admin', label: '' };
  }
  const status = account.jubilee_reg_status || 'none';
  if (status === 'paid') {
    return { show: false, href: '/member', label: '' };
  }
  if (status === 'pending_payment') {
    return {
      show: true,
      href: '/registration',
      label: pendingPaymentLabel(account.payment_proof_pending),
    };
  }
  return { show: true, href: '/registration', label: 'Register for Alumni Meet' };
}

/** Compact nav label (shorter than hero). */
export function jubileeNavCta(account: JubileeAccountHint | null | undefined): JubileeCta {
  if (!account) return { show: true, href: '/registration', label: 'Register' };
  if (account.role === 'admin') return { show: false, href: '/admin', label: '' };
  if (account.jubilee_reg_status === 'paid') {
    return { show: false, href: '/member', label: '' };
  }
  if (account.jubilee_reg_status === 'pending_payment') {
    return {
      show: true,
      href: '/registration',
      label: pendingPaymentLabel(account.payment_proof_pending),
    };
  }
  return { show: true, href: '/registration', label: 'Register' };
}

export function postAuthPath(account: JubileeAccountHint): string {
  if (account.role === 'admin') return '/admin';
  const status = account.jubilee_reg_status || 'none';
  if (status === 'paid') return '/member';
  return '/registration';
}
