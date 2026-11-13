// app/(auth)/signup/page.tsx
'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeRegistrationNext } from '@/lib/events/choose-event';
import PasswordInput from '@/components/password-input';
import BackHomeLink from '@/components/back-home-link';
import { ConfirmPrefillScreen } from '@/components/registration_page/registration-screens';
import { isPublicEmail } from '@/lib/email';
import {
    COUNTRY_CALLING_CODES,
    phoneInputHint,
    phoneValidationError,
    splitE164,
    toE164,
} from '@/lib/phone';
import {
    parsePreRegistrationRow,
    type PreRegistrationData,
} from '@/lib/registration/types';

// Names allow letters from any script and spaces only. Digits, punctuation and
// symbols are rejected so names stay clean in certificates, badges and exports.
const NAME_ALLOWED_CHARS_PATTERN = /[^\p{L} ]/gu;
const NAME_VALID_PATTERN = /^[\p{L} ]+$/u;

// Usernames allow letters, digits and underscores only. Usernames are used in
// URLs and mentions, so spaces and symbols are excluded.
const USERNAME_DISALLOWED_CHARS_PATTERN = /[^\p{L}\p{N}_]/gu;
const USERNAME_VALID_PATTERN = /^[\p{L}\p{N}_]+$/u;

// Strips disallowed characters as the user types or pastes, so invalid input
// never appears in the field. Validation on submit still runs as a backstop.
function sanitizeNameInput(raw: string): string {
    return raw.replace(NAME_ALLOWED_CHARS_PATTERN, '');
}

function sanitizeUsernameInput(raw: string): string {
    return raw.replace(USERNAME_DISALLOWED_CHARS_PATTERN, '');
}

function namesFromRoster(match: PreRegistrationData): { firstName: string; lastName: string } {
    const given = sanitizeNameInput(match.given_name || '').trim();
    const last = sanitizeNameInput(match.last_name || '').trim();
    if (given) return { firstName: given, lastName: last };
    const parts = sanitizeNameInput(match.full_name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length <= 1) return { firstName: parts[0] || '', lastName: last };
    if (last) return { firstName: parts.join(' '), lastName: last };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] || '' };
}

export default function SignupPage() {
    return (
        <Suspense fallback={null}>
            <SignupForm />
        </Suspense>
    );
}

function SignupForm() {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneIsd, setPhoneIsd] = useState('+91');
    const [phoneNational, setPhoneNational] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lookingUp, setLookingUp] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [prefillHint, setPrefillHint] = useState('');
    const [confirmMatch, setConfirmMatch] = useState<PreRegistrationData | null>(null);
    const [confirmCandidates, setConfirmCandidates] = useState<PreRegistrationData[]>([]);
    const lookupSeq = useRef(0);
    const router = useRouter();
    const searchParams = useSearchParams();

    function applyRosterMatch(match: PreRegistrationData) {
        const names = namesFromRoster(match);
        if (names.firstName) setFirstName(names.firstName);
        if (names.lastName) setLastName(names.lastName);
        if (match.email && isPublicEmail(match.email) && !email.trim()) {
            setEmail(match.email);
        }
        if (match.phone_number && !phoneNational.trim()) {
            const split = splitE164(match.phone_number);
            setPhoneIsd(split.isd);
            setPhoneNational(split.national);
        }
        setPrefillHint('We filled your details from the member list. You can edit them.');
        setConfirmMatch(null);
        setConfirmCandidates([]);
    }

    async function lookupFromRoster() {
        if (loading || lookingUp) return;
        const e164 = toE164(phoneIsd, phoneNational);
        const trimmedEmail = email.trim();
        if (!e164 && !trimmedEmail) return;

        const seq = ++lookupSeq.current;
        setLookingUp(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (e164) params.set('phone', e164);
            if (trimmedEmail) params.set('email', trimmedEmail);
            const res = await fetch(`/api/registration/roster-lookup?${params.toString()}`, {
                cache: 'no-store',
            });
            if (seq !== lookupSeq.current) return;
            if (!res.ok) {
                if (res.status !== 400) {
                    const payload = await res.json().catch(() => ({}));
                    if (payload.error) setPrefillHint('');
                }
                return;
            }
            const payload = (await res.json().catch(() => ({}))) as {
                kind?: string;
                auto?: boolean;
                matches?: unknown[];
            };
            const matches = (payload.matches || [])
                .map((row) => parsePreRegistrationRow(row))
                .filter((row): row is PreRegistrationData => row != null);
            if (!matches.length) {
                setPrefillHint('');
                return;
            }
            if (payload.auto || (payload.kind === 'exact' && matches.length === 1)) {
                applyRosterMatch(matches[0]);
                return;
            }
            setConfirmMatch(matches[0]);
            setConfirmCandidates(matches);
        } catch {
            // Prefill is optional; signup still works without it.
        } finally {
            if (seq === lookupSeq.current) setLookingUp(false);
        }
    }

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        const trimmedUsername = username.trim();

        if (!trimmedFirstName || !trimmedLastName) {
            setError('First name and last name are required');
            setLoading(false);
            return;
        }
        if (!NAME_VALID_PATTERN.test(trimmedFirstName) || !NAME_VALID_PATTERN.test(trimmedLastName)) {
            setError('First and last name can only contain letters and spaces');
            setLoading(false);
            return;
        }
        if (trimmedUsername && !USERNAME_VALID_PATTERN.test(trimmedUsername)) {
            setError('Username can only contain letters, numbers and underscores');
            setLoading(false);
            return;
        }
        if (!agreeTerms) {
            setError('Please agree to the terms and conditions');
            setLoading(false);
            return;
        }
        if (!isPublicEmail(email)) {
            setError(
                'Use a public email address (Gmail, Yahoo, Outlook, iCloud, Proton, Rediffmail, AOL, or Zoho)'
            );
            setLoading(false);
            return;
        }
        const phoneErr = phoneValidationError(phoneIsd, phoneNational);
        if (phoneErr || !toE164(phoneIsd, phoneNational)) {
            setError(phoneErr || 'Enter a valid phone number with country code (ISD) and national number');
            setLoading(false);
            return;
        }

        if (password !== passwordConfirm) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    email,
                    username: trimmedUsername,
                    password,
                    passwordConfirm,
                    firstName: trimmedFirstName,
                    lastName: trimmedLastName,
                    phoneIsd: phoneIsd.trim(),
                    phoneNational: phoneNational.trim(),
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(payload.error || 'Failed to create account');
                setLoading(false);
                return;
            }

            setSuccess('Account created! Redirecting...');
            setTimeout(async () => {
                const meRes = await fetch('/api/auth/me');
                const me = meRes.ok ? await meRes.json() : null;
                const next = safeRegistrationNext(searchParams.get('next'));
                if (me?.role === 'admin') router.push('/admin');
                else if (next) router.push(next);
                else if (me?.jubilee_reg_status === 'paid') router.push('/member');
                else router.push('/registration');
            }, 1500);
        } catch {
            setError('An unexpected error occurred');
            setLoading(false);
        }
    }

    if (confirmMatch) {
        return (
            <ConfirmPrefillScreen
                preRegData={confirmMatch}
                candidates={confirmCandidates}
                onAccept={applyRosterMatch}
                onReject={() => {
                    setConfirmMatch(null);
                    setConfirmCandidates([]);
                    setPrefillHint('');
                }}
            />
        );
    }

    const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
    const usernamePreview = username.trim() || email.trim() || 'your email';
    const fieldClass =
        'px-4 py-3.5 rounded-lg border border-outline-variant text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all disabled:bg-surface-container disabled:text-on-surface-variant';

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6 pt-20">
            <div className="w-full max-w-lg">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <img
                            alt="SFS Shanthinagar Emblem"
                            className="h-12 w-auto object-contain"
                            src="/images/emblem.png"
                        />
                    </div>
                    <h1 className="text-headline-lg text-primary mb-2">Create Your Account</h1>
                    <p className="text-body-sm text-on-surface-variant">
                        Register for the reunion and join the celebration
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-surface-paper rounded-xl shadow-md p-8 border border-surface-container-low">
                    <form onSubmit={handleSignup} className="space-y-4">
                        {/* Email first so lookup can run before names */}
                        <div className="flex flex-col">
                            <label className="text-label-md text-primary mb-2 uppercase tracking-wider" htmlFor="email">
                                Email Address *
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => void lookupFromRoster()}
                                placeholder="you@gmail.com"
                                required
                                autoComplete="email"
                                disabled={loading}
                                className={fieldClass}
                            />
                            <p className="text-label-sm text-on-surface-variant mt-1">
                                Public email only (Gmail, Yahoo, Outlook, iCloud, Proton, Rediffmail, AOL, Zoho).
                                We look up the member list when you leave this field.
                            </p>
                        </div>

                        {/* Phone: ISD + national */}
                        <div className="flex flex-col">
                            <label className="text-label-md text-primary mb-2 uppercase tracking-wider">
                                Phone Number *
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={phoneIsd}
                                    onChange={(e) => setPhoneIsd(e.target.value)}
                                    required
                                    disabled={loading}
                                    aria-label="Country calling code"
                                    className="w-[9.5rem] shrink-0 px-2 py-3 rounded-lg border border-outline-variant text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all disabled:bg-surface-container disabled:text-on-surface-variant"
                                >
                                    {COUNTRY_CALLING_CODES.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="tel"
                                    value={phoneNational}
                                    onChange={(e) =>
                                        setPhoneNational(e.target.value.replace(/\D/g, ''))
                                    }
                                    onBlur={() => void lookupFromRoster()}
                                    placeholder="9876543210"
                                    required
                                    disabled={loading}
                                    inputMode="numeric"
                                    autoComplete="tel-national"
                                    maxLength={12}
                                    aria-label="National phone number"
                                    aria-invalid={Boolean(
                                        phoneNational && phoneValidationError(phoneIsd, phoneNational)
                                    )}
                                    className="min-w-0 flex-1 px-4 py-3.5 rounded-lg border border-outline-variant text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all disabled:bg-surface-container disabled:text-on-surface-variant"
                                />
                            </div>
                            <p
                                className={`text-label-sm mt-1 ${
                                    phoneNational && phoneValidationError(phoneIsd, phoneNational)
                                        ? 'text-error'
                                        : 'text-on-surface-variant'
                                }`}
                            >
                                {phoneNational && phoneValidationError(phoneIsd, phoneNational)
                                    ? phoneValidationError(phoneIsd, phoneNational)
                                    : lookingUp
                                      ? 'Looking up the member list…'
                                      : phoneInputHint(phoneIsd)}
                            </p>
                        </div>

                        {prefillHint ? (
                            <p role="status" className="text-label-sm text-primary">
                                {prefillHint}
                            </p>
                        ) : null}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label className="text-label-md text-primary mb-2 uppercase tracking-wider" htmlFor="first-name">
                                    First Name *
                                </label>
                                <input
                                    id="first-name"
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(sanitizeNameInput(e.target.value))}
                                    placeholder="John"
                                    required
                                    autoComplete="given-name"
                                    disabled={loading}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-label-md text-primary mb-2 uppercase tracking-wider" htmlFor="last-name">
                                    Last Name *
                                </label>
                                <input
                                    id="last-name"
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(sanitizeNameInput(e.target.value))}
                                    placeholder="Doe"
                                    required
                                    autoComplete="family-name"
                                    disabled={loading}
                                    className={fieldClass}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-label-md text-primary mb-2 uppercase tracking-wider" htmlFor="username">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                                placeholder="Optional"
                                autoComplete="username"
                                disabled={loading}
                                className={fieldClass}
                            />
                            <p className="text-label-sm text-on-surface-variant mt-1">
                                Letters, numbers and underscores only. Leave blank to use your email. Your username will be {usernamePreview}.
                            </p>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-label-md text-primary mb-2 uppercase tracking-wider" htmlFor="password">
                                Password *
                            </label>
                            <PasswordInput
                                id="password"
                                value={password}
                                onChange={setPassword}
                                placeholder="At least 8 characters"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                disabled={loading}
                                className={fieldClass}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-label-md text-primary mb-2 uppercase tracking-wider" htmlFor="password-confirm">
                                Confirm Password *
                            </label>
                            <PasswordInput
                                id="password-confirm"
                                value={passwordConfirm}
                                onChange={setPasswordConfirm}
                                placeholder="Re-enter your password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                disabled={loading}
                                ariaInvalid={passwordMismatch}
                                ariaDescribedBy={passwordMismatch ? 'password-confirm-error' : undefined}
                                className={fieldClass}
                            />
                            {passwordMismatch && (
                                <p id="password-confirm-error" className="text-label-sm text-error mt-1">
                                    Passwords do not match
                                </p>
                            )}
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start gap-2.5 mt-5">
                            <input
                                type="checkbox"
                                id="agree-terms"
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                                required
                                disabled={loading}
                                className="mt-1 w-5 h-5 rounded border-outline-variant accent-primary cursor-pointer disabled:opacity-50"
                            />
                            <label htmlFor="agree-terms" className="text-body-sm text-on-surface-variant cursor-pointer">
                                I agree to the{' '}
                                <Link href="#" className="text-primary hover:text-navy-subtle underline">
                                    terms and conditions
                                </Link>{' '}
                                and{' '}
                                <Link href="#" className="text-primary hover:text-navy-subtle underline">
                                    privacy policy
                                </Link>
                            </label>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 rounded-lg bg-error-container text-error text-body-sm">
                                {error}
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="p-3 rounded-lg bg-green-100 text-green-800 text-body-sm">
                                {success}
                            </div>
                        )}

                        {/* Signup Button */}
                        <button
                            type="submit"
                            disabled={loading || !agreeTerms || passwordMismatch}
                            className="w-full py-3 rounded-lg bg-primary text-on-primary text-label-md uppercase tracking-wider font-bold hover:bg-navy-subtle disabled:bg-surface-container disabled:text-on-surface-variant transition-all mt-6"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-outline-variant"></div>
                        <span className="text-label-sm text-on-surface-variant">OR</span>
                        <div className="flex-1 h-px bg-outline-variant"></div>
                    </div>

                    {/* Login Link */}
                    <div className="text-center">
                        <p className="text-body-sm text-on-surface-variant mb-3">
                            Already have an account?
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary-container hover:bg-secondary-fixed-dim text-on-secondary-fixed text-label-md uppercase tracking-wider transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">login</span>
                            Sign In
                        </Link>
                    </div>
                </div>

                <div className="text-center mt-8">
                    <BackHomeLink />
                </div>
            </div>
        </div>
    );
}
