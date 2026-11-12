export type RegistrationPaymentStatus = 'pending' | 'partial' | 'paid' | 'cancelled';

export function amountDuePaise(totalCostPaise: number, amountPaidPaise: number): number {
  const total = Math.max(0, Math.floor(Number(totalCostPaise) || 0));
  const paid = Math.max(0, Math.floor(Number(amountPaidPaise) || 0));
  return Math.max(0, total - paid);
}

export function statusFromAmounts(
  totalCostPaise: number,
  amountPaidPaise: number
): Exclude<RegistrationPaymentStatus, 'cancelled'> {
  const total = Math.max(0, Math.floor(Number(totalCostPaise) || 0));
  const paid = Math.max(0, Math.floor(Number(amountPaidPaise) || 0));
  if (total === 0 || paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'pending';
}

/** Apply a payment (or admin settle). Never decreases amount_paid; caps at total. */
export function applyPaymentAmounts(
  totalCostPaise: number,
  amountPaidPaise: number,
  paymentPaise: number
): {
  amount_paid_paise: number;
  payment_status: Exclude<RegistrationPaymentStatus, 'cancelled'>;
  amount_due_paise: number;
} {
  const total = Math.max(0, Math.floor(Number(totalCostPaise) || 0));
  const paid = Math.max(0, Math.floor(Number(amountPaidPaise) || 0));
  const add = Math.max(0, Math.floor(Number(paymentPaise) || 0));
  const nextPaid = Math.min(total, paid + add);
  const payment_status = statusFromAmounts(total, nextPaid);
  return {
    amount_paid_paise: nextPaid,
    payment_status,
    amount_due_paise: amountDuePaise(total, nextPaid),
  };
}

export function jubileeStatusFromPayment(
  paymentStatus: RegistrationPaymentStatus
): 'pending_payment' | 'paid' {
  return paymentStatus === 'paid' ? 'paid' : 'pending_payment';
}

/** Open (non-cancelled) registration statuses for unique index / queries. */
export const OPEN_PAYMENT_STATUSES = ['pending', 'partial', 'paid'] as const;
