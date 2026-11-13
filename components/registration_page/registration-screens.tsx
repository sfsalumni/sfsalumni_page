// components/registration_page/registration-screens.tsx
// Stateless screens shown before the form: admin notice, event picker,
// unavailable event, signed-out prompt, and pre-registration confirmation.

import Link from 'next/link';
import BackHomeLink from '@/components/back-home-link';
import { registrationPath } from '@/lib/events/choose-event';
import { eventFeeSummary } from '@/lib/events/pricing';
import type { EventCatalog } from '@/lib/events/types';
import type { PreRegistrationData } from '@/lib/registration/types';

export function AdminNoticeScreen() {
    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6 pt-20">
            <div className="w-full max-w-lg bg-surface-paper rounded-2xl shadow-lg p-8 border border-surface-container-low text-center">
                <span className="material-symbols-outlined text-[48px] text-jubilee-gold-deep mx-auto block mb-4">
                    admin_panel_settings
                </span>
                <h1 className="text-headline-lg text-primary mb-3">Committee account</h1>
                <p className="text-body-md text-on-surface-variant mb-8">
                    Alumni committee accounts manage memberships and do not register for the reunion
                    through this form.
                </p>
                <Link
                    href="/admin"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-on-primary text-label-md uppercase tracking-wider"
                >
                    Go to admin
                </Link>
            </div>
        </div>
    );
}

export interface ChooseEventScreenProps {
    choices: EventCatalog[];
}

export function ChooseEventScreen({ choices }: ChooseEventScreenProps) {
    return (
        <div className="min-h-screen bg-surface px-6 pt-28 pb-16">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-headline-lg text-primary mb-2">Choose an event</h1>
                <p className="text-body-md text-on-surface-variant mb-8">
                    Registration is separate for each event. Pick the one you want to attend.
                </p>
                <div className="grid gap-4">
                    {choices.map((choice) => (
                        <article
                            key={choice.id}
                            className="rounded-2xl bg-surface-paper border border-primary/10 p-6 shadow-sm"
                        >
                            <div className="text-label-sm uppercase tracking-widest text-jubilee-gold-deep font-bold">
                                {new Date(choice.starts_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </div>
                            <h2 className="text-headline-sm text-primary mt-2">{choice.title}</h2>
                            <p className="text-body-sm text-navy-subtle mt-2">{choice.summary}</p>
                            <p className="text-label-sm text-navy-subtle mt-3">{eventFeeSummary()}</p>
                            <Link
                                href={registrationPath(choice.id)}
                                className="inline-flex mt-5 rounded-lg bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed px-4 py-2.5 text-label-sm font-bold"
                            >
                                Register
                            </Link>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}

export interface EventUnavailableScreenProps {
    message: string;
}

export function EventUnavailableScreen({ message }: EventUnavailableScreenProps) {
    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6 pt-20">
            <div className="w-full max-w-lg bg-surface-paper rounded-2xl shadow-lg p-8 border border-surface-container-low text-center">
                <h1 className="text-headline-lg text-primary mb-3">Event unavailable</h1>
                <p className="text-body-md text-on-surface-variant mb-8">{message}</p>
                <Link
                    href="/events"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-on-primary text-label-md uppercase tracking-wider"
                >
                    View events
                </Link>
            </div>
        </div>
    );
}

export interface SignInScreenProps {
    event: EventCatalog | null;
}

export function SignInScreen({ event }: SignInScreenProps) {
    const nextParam = event ? `?next=${encodeURIComponent(registrationPath(event.id))}` : '';
    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6 pt-20">
            <div className="w-full max-w-lg">
                <div className="bg-surface-paper rounded-2xl shadow-lg p-8 border border-surface-container-low text-center">
                    <div className="mb-6">
                        <span className="material-symbols-outlined text-[48px] text-jubilee-gold-deep mx-auto block">
                            how_to_reg
                        </span>
                    </div>

                    <h1 className="text-headline-lg text-primary mb-3">Registration Required</h1>

                    <p className="text-body-md text-on-surface-variant mb-8">
                        To register for the Golden Jubilee, you need to create an account or log in with your
                        existing account.
                    </p>

                    <div className="flex flex-col gap-3 mb-6">
                        <Link
                            href={event ? `/signup${nextParam}` : '/signup'}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-secondary-container hover:bg-secondary-fixed-dim text-on-secondary-fixed text-label-md uppercase tracking-wider shadow-md transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">person_add</span>
                            Create New Account
                        </Link>

                        <Link
                            href={event ? `/login${nextParam}` : '/login'}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-primary hover:bg-navy-subtle text-on-primary text-label-md uppercase tracking-wider shadow-md transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">login</span>
                            Sign In to Existing Account
                        </Link>
                    </div>

                    <p className="text-body-sm text-on-surface-variant">
                        Already have an account? Sign in to automatically prefill your registration.
                    </p>

                    <div className="mt-8">
                        <BackHomeLink signedIn={false} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export interface ConfirmPrefillScreenProps {
    preRegData: PreRegistrationData;
    /** When several roster rows match, show a pick list. */
    candidates?: PreRegistrationData[];
    onAccept: (match: PreRegistrationData) => void;
    onReject: () => void;
}

function matchHint(matchType: PreRegistrationData['match_type']): string {
    if (matchType === 'phone_only') return 'Matched on phone; email differed or was missing.';
    if (matchType === 'email_only') return 'Matched on email; phone differed or was missing.';
    if (matchType === 'name') return 'Matched on name — confirm the right person.';
    return 'We found a possible match in the member list.';
}

export function ConfirmPrefillScreen({
    preRegData,
    candidates,
    onAccept,
    onReject,
}: ConfirmPrefillScreenProps) {
    const list = candidates && candidates.length > 1 ? candidates : [preRegData];
    const multi = list.length > 1;

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6 pt-20 pb-12">
            <div className="w-full max-w-3xl">
                <div className="bg-surface-paper rounded-2xl shadow-lg p-8 border border-surface-container-low">
                    <h1 className="text-headline-lg text-primary mb-2">
                        {multi ? 'Which record is yours?' : 'We found your information'}
                    </h1>
                    <p className="text-body-md text-on-surface-variant mb-8">
                        {multi
                            ? 'Several people matched. Pick yours, or continue without prefilling.'
                            : matchHint(preRegData.match_type)}
                    </p>

                    <div className="space-y-3 mb-6">
                        {list.map((match) => (
                            <div
                                key={match.id}
                                className="bg-surface-container-low rounded-lg p-5 space-y-2"
                            >
                                <div className="flex justify-between gap-4">
                                    <span className="text-label-md text-on-surface-variant">Name</span>
                                    <span className="text-body-md text-primary font-semibold text-right">
                                        {match.full_name}
                                    </span>
                                </div>
                                {match.email ? (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-label-md text-on-surface-variant">Email</span>
                                        <span className="text-body-md text-primary text-right">{match.email}</span>
                                    </div>
                                ) : null}
                                <div className="flex justify-between gap-4">
                                    <span className="text-label-md text-on-surface-variant">Batch</span>
                                    <span className="text-body-md text-primary">
                                        {match.batch || 'Not specified'}
                                        {match.section ? ` · ${match.section}` : ''}
                                    </span>
                                </div>
                                {multi ? (
                                    <button
                                        type="button"
                                        onClick={() => onAccept(match)}
                                        className="mt-3 w-full py-3 rounded-lg bg-primary text-on-primary text-label-md uppercase tracking-wider font-bold hover:bg-navy-subtle transition-all"
                                    >
                                        This is me
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        {!multi ? (
                            <button
                                type="button"
                                onClick={() => onAccept(preRegData)}
                                className="flex-1 py-3 rounded-lg bg-primary text-on-primary text-label-md uppercase tracking-wider font-bold hover:bg-navy-subtle transition-all"
                            >
                                Yes, this is correct
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={onReject}
                            className="flex-1 py-3 rounded-lg bg-surface-container text-primary text-label-md uppercase tracking-wider font-bold hover:bg-surface-container-high transition-all"
                        >
                            {multi ? 'None of these' : 'No, continue anyway'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}