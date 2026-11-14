export type PrimaryNextAction = {
  label: string;
  href: string;
  kind: 'register' | 'continue';
};

/**
 * Primary CTA on member home.
 * Unpaid / confirmed registrations already have a button on the venue pass —
 * do not add a second "Continue registration" or "pass ready" CTA here.
 */
export function primaryNextAction(input: {
  hasRegistration: boolean;
  anyUnpaid: boolean;
  continueHref?: string;
}): PrimaryNextAction | null {
  if (!input.hasRegistration) {
    return { kind: 'register', label: 'Register for an event', href: '/events' };
  }
  return null;
}
