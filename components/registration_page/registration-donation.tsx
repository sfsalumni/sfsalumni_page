// Donation choice and payment route. Bank / UPI opens OfflinePayModal after the registration is saved.

import { useState, type Dispatch, type SetStateAction } from 'react';
import OfflinePayModal from '@/components/offline-pay-modal';
import { formatCostForDisplay } from '@/lib/registration/registration';
import { approximateInCurrency, type DisplayCurrency, type ExchangeRateState } from '@/lib/registration/currency';
import type { BankAccountPublic } from '@/lib/payments/bank-details';
import {
    DONATION_MAX_RUPEES,
    DONATION_MIN_RUPEES,
    DONATION_OPTIONS,
    donationValidationError,
    type DonationOption,
    type FormData,
    type RegistrationMoney,
} from '@/lib/registration/types';

export type PaymentRoute = 'portal' | 'bank';

const INPUT_CLASS =
    'px-4 py-3 rounded-lg border border-outline-variant text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50';

export interface DonationSectionProps {
    formData: FormData;
    setFormData: Dispatch<SetStateAction<FormData>>;
    busy: boolean;
    money: RegistrationMoney;
    displayMoney: RegistrationMoney;
    formDirty: boolean;
    donationLocked: boolean;
    paymentRoute: PaymentRoute;
    setPaymentRoute: (route: PaymentRoute) => void;
    bankAccount: BankAccountPublic | null;
    /** Ensures the registration is saved; returns registration id or an error message. */
    onPrepareOfflinePay: () => Promise<{ registrationId: string } | { error: string }>;
    savedBankReference: string;
    onOfflineSubmitted: (message: string, utr?: string) => void;
    displayCurrency: DisplayCurrency;
    exchange: ExchangeRateState;
}

export function DonationSection({
    formData,
    setFormData,
    busy,
    money,
    displayMoney,
    formDirty,
    donationLocked,
    paymentRoute,
    setPaymentRoute,
    bankAccount,
    onPrepareOfflinePay,
    savedBankReference,
    onOfflineSubmitted,
    displayCurrency,
    exchange,
}: DonationSectionProps) {
    const validationError = donationValidationError(formData);

    function chooseOption(option: DonationOption) {
        setFormData({ ...formData, donation_option: option });
    }

    function enterCustomAmount(raw: string) {
        setFormData({
            ...formData,
            donation_option: 'custom',
            donation_custom: raw.replace(/\D/g, ''),
        });
    }

    return (
        <section className="rounded-lg border border-outline-variant bg-surface p-6 space-y-5">
            <div>
                <h2 className="text-headline-sm text-primary uppercase tracking-wider">Donation</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">Additional INR donation to fund the event:</p>
            </div>

            {donationLocked && (
                <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface">
                    Your donation is paid. To change it, contact the committee.
                </p>
            )}

            <div className="flex flex-col gap-3">
                {DONATION_OPTIONS.map((option) => (
                    <div key={option.value} className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="donation_option"
                                value={option.value}
                                checked={formData.donation_option === option.value}
                                onChange={() => chooseOption(option.value)}
                                disabled={busy || donationLocked}
                                className="w-4 h-4 accent-primary cursor-pointer disabled:opacity-50"
                            />
                            <span className="text-body-sm text-on-surface">{option.label}</span>
                        </label>
                        {option.value === 'custom' && (
                            <input
                                type="number"
                                inputMode="numeric"
                                min={DONATION_MIN_RUPEES}
                                max={DONATION_MAX_RUPEES}
                                step={1}
                                value={formData.donation_custom}
                                onChange={(e) => enterCustomAmount(e.target.value)}
                                placeholder={`Rs. ${DONATION_MIN_RUPEES} – ${DONATION_MAX_RUPEES.toLocaleString('en-IN')}`}
                                disabled={busy || donationLocked}
                                aria-label="Custom donation amount in rupees"
                                className={`w-56 ${INPUT_CLASS}`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {validationError && (
                <p role="alert" className="text-label-sm text-error">
                    {validationError}
                </p>
            )}

            <div className="space-y-3">
                <p className="text-label-md text-primary uppercase tracking-wider">How would you like to pay?</p>
                <label className="flex items-center gap-3">
                    <input
                        type="radio"
                        name="payment_route"
                        checked={paymentRoute === 'portal'}
                        onChange={() => setPaymentRoute('portal')}
                        className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    <span className="text-body-sm text-on-surface">Pay through this portal</span>
                </label>
                <label className="flex items-center gap-3">
                    <input
                        type="radio"
                        name="payment_route"
                        checked={paymentRoute === 'bank'}
                        onChange={() => setPaymentRoute('bank')}
                        className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    <span className="text-body-sm text-on-surface">
                        Bank / UPI transfer (recommended for remittances from abroad)
                    </span>
                </label>
            </div>

            {paymentRoute === 'bank' && (
                <BankTransferSection
                    amountDuePaise={displayMoney.totalDuePaise}
                    formDirty={formDirty}
                    busy={busy}
                    paymentStatus={money.paymentStatus}
                    bankAccount={bankAccount}
                    onPrepareOfflinePay={onPrepareOfflinePay}
                    savedBankReference={savedBankReference}
                    onOfflineSubmitted={onOfflineSubmitted}
                    displayCurrency={displayCurrency}
                    exchange={exchange}
                />
            )}
        </section>
    );
}

interface BankTransferSectionProps {
    amountDuePaise: number;
    formDirty: boolean;
    busy: boolean;
    paymentStatus: string | null;
    bankAccount: BankAccountPublic | null;
    onPrepareOfflinePay: () => Promise<{ registrationId: string } | { error: string }>;
    savedBankReference: string;
    onOfflineSubmitted: (message: string, utr?: string) => void;
    displayCurrency: DisplayCurrency;
    exchange: ExchangeRateState;
}

function BankTransferSection({
    amountDuePaise,
    formDirty,
    busy,
    paymentStatus,
    bankAccount,
    onPrepareOfflinePay,
    savedBankReference,
    onOfflineSubmitted,
    displayCurrency,
    exchange,
}: BankTransferSectionProps) {
    const [open, setOpen] = useState(false);
    const [registrationId, setRegistrationId] = useState('');
    const [preparing, setPreparing] = useState(false);
    const [error, setError] = useState('');

    const approxDue = approximateInCurrency(amountDuePaise, displayCurrency, exchange);

    async function openPayModal() {
        if (preparing || busy) return;
        setPreparing(true);
        setError('');
        const result = await onPrepareOfflinePay();
        setPreparing(false);
        if ('error' in result) {
            setError(result.error);
            return;
        }
        if (!bankAccount) {
            setError('Bank details are not configured yet. Contact the committee.');
            return;
        }
        setRegistrationId(result.registrationId);
        setOpen(true);
    }

    if (amountDuePaise <= 0) {
        return <p className="text-body-sm text-on-surface-variant">Nothing is due for bank transfer right now.</p>;
    }

    return (
        <div className="rounded-lg border border-outline-variant p-5 space-y-4">
            <div className="text-body-sm text-on-surface">
                <p>
                    Amount to pay:{' '}
                    <span className="font-semibold tabular-nums">{formatCostForDisplay(amountDuePaise)}</span> (INR)
                    {formDirty ? ' · preview, saved when you open bank / UPI details' : ''}.
                </p>
                {approxDue && (
                    <p className="text-on-surface-variant">
                        ≈ {approxDue} {displayCurrency} at the approximate reference rate. Your bank applies its own rate.
                    </p>
                )}
            </div>

            {savedBankReference ? (
                <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface">
                    {savedBankReference}
                </p>
            ) : null}

            <button
                type="button"
                onClick={() => void openPayModal()}
                disabled={busy || preparing || !bankAccount}
                className="w-full sm:w-auto px-8 py-3 rounded-lg bg-primary text-on-primary text-label-md uppercase tracking-wider font-bold hover:bg-navy-subtle disabled:bg-surface-container disabled:text-on-surface-variant transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
                {preparing ? 'Preparing…' : 'Bank / UPI transfer'}
            </button>

            {!bankAccount && (
                <p className="text-body-sm text-on-surface-variant">
                    Bank details are not available yet. Contact the committee.
                </p>
            )}

            {error && (
                <p role="alert" className="text-body-sm text-error">
                    {error}
                </p>
            )}

            <div className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant space-y-2">
                <p>
                    Payments are reconciled with the bank remittance and shown as paid once confirmed. Please check back
                    in 3–5 business days.
                </p>
                <p>
                    Current status: <span className="font-semibold text-on-surface">{paymentStatus || 'pending'}</span>
                </p>
            </div>

            {bankAccount && registrationId ? (
                <OfflinePayModal
                    open={open}
                    onClose={() => setOpen(false)}
                    account={bankAccount}
                    amountPaise={amountDuePaise}
                    note="Golden Jubilee registration"
                    source={{ type: 'registration', registrationId }}
                    onSubmitted={(message) => {
                        onOfflineSubmitted(message);
                        setOpen(false);
                    }}
                />
            ) : null}
        </div>
    );
}
