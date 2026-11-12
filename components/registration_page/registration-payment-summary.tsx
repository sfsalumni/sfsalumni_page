// components/registration_page/registration-payment-summary.tsx
// Payment card. Shows the saved amounts, or a live preview while the form has unsaved edits.
// The figures are passed in; this component does no fee or donation calculation of its own.

import type { ComponentProps } from 'react';
import AmountWithFx from '@/components/amount-with-fx';
import RefundEmailCta from '@/components/refund-email-cta';
import { formatCostForDisplay } from '@/lib/registration/registration';
import type { RegistrationMoney } from '@/lib/registration/types';

type RefundEmail = ComponentProps<typeof RefundEmailCta>['refundEmail'];

export interface PaymentSummaryProps {
  /** Figures to show: saved amounts, or the live preview while the form has edits. */
  money: RegistrationMoney;
  isPreview: boolean;
  refundEmail: RefundEmail;
  eventTitle: string;
  fullName: string;
}

export function PaymentSummary({
  money,
  isPreview,
  refundEmail,
  eventTitle,
  fullName,
}: PaymentSummaryProps) {
  const donationPaid = money.donationPaymentStatus === 'paid';
  const totalPaise = money.feeTotalPaise + money.donationIntendedPaise;
  const alreadyPaidPaise = money.feePaidPaise + (donationPaid ? money.donationIntendedPaise : 0);
  const duePaise = money.totalDuePaise;

  return (
    <section className="bg-surface-container-low rounded-lg px-6 py-6 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-headline-sm text-primary uppercase tracking-wider">Payment summary</h2>
        <span className="text-label-sm text-on-surface-variant">
          {isPreview ? 'Preview: not saved yet' : 'Saved amounts'}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-body-md text-on-surface-variant">Registration fee</span>
        <span className="text-body-md text-on-surface tabular-nums">
          {formatCostForDisplay(money.feeTotalPaise)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-body-md text-on-surface-variant">
          Donation{donationPaid ? ' (paid)' : ''}
        </span>
        <span className="text-body-md text-on-surface tabular-nums">
          {formatCostForDisplay(money.donationIntendedPaise)}
        </span>
      </div>
      <div className="flex justify-between items-center border-t border-outline-variant pt-3">
        <span className="text-body-md text-on-surface-variant">Total</span>
        <span className="text-headline-sm text-primary tabular-nums">
          {formatCostForDisplay(totalPaise)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-body-md text-on-surface-variant">Already paid</span>
        <span className="text-body-md text-on-surface tabular-nums">
          {formatCostForDisplay(alreadyPaidPaise)}
        </span>
      </div>
      <div className="flex justify-between items-start gap-4 border-t border-outline-variant pt-3">
        <span className="text-headline-sm text-primary pt-1">Due now</span>
        <AmountWithFx
          paise={duePaise}
          className="text-right"
          primaryClassName="text-headline-md text-jubilee-gold-deep tabular-nums"
        />
      </div>

      {isPreview && (
        <p className="text-label-sm text-on-surface-variant">
          These figures show your unsaved changes. Pay or save to store them.
        </p>
      )}

      <p className="text-label-sm text-on-surface-variant">
        Amounts are in INR. Use View in for an approximate foreign estimate — your bank’s rate will
        differ. You always pay in INR.
      </p>

      <RefundEmailCta
        refundEmail={refundEmail}
        eventTitle={eventTitle}
        fullName={fullName}
        registrationCode={money.registrationCode}
        totalPaise={totalPaise}
        paidPaise={alreadyPaidPaise}
      />
    </section>
  );
}
