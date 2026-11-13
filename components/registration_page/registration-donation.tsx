// Donation choice only. Bank / UPI pay lives next to Save changes on the registration form.

import type { Dispatch, SetStateAction } from 'react';
import {
    DONATION_MAX_RUPEES,
    DONATION_MIN_RUPEES,
    DONATION_OPTIONS,
    donationValidationError,
    type DonationOption,
    type FormData,
} from '@/lib/registration/types';

const INPUT_CLASS =
    'px-4 py-3 rounded-lg border border-outline-variant text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50';

export interface DonationSectionProps {
    formData: FormData;
    setFormData: Dispatch<SetStateAction<FormData>>;
    busy: boolean;
    donationLocked: boolean;
    verificationPending: boolean;
}

export function DonationSection({
    formData,
    setFormData,
    busy,
    donationLocked,
    verificationPending,
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

            {donationLocked && !verificationPending && (
                <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface">
                    Your donation is paid. To change it, contact the committee.
                </p>
            )}
            {verificationPending && (
                <p className="rounded-lg bg-surface-container-low px-4 py-3 text-body-sm text-on-surface">
                    Donation is locked while Bank / UPI verification is pending.
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
        </section>
    );
}
