export type PrimaryNextAction = {
  label: string;
  href: string;
  kind: 'register' | 'continue' | 'pass_ready';
};

export function primaryNextAction(input: {
  hasRegistration: boolean;
  anyUnpaid: boolean;
  continueHref?: string;
}): PrimaryNextAction {
  if (!input.hasRegistration) {
    return { kind: 'register', label: 'Register for an event', href: '/events' };
  }
  if (input.anyUnpaid) {
    return {
      kind: 'continue',
      label: 'Continue registration',
      href: input.continueHref || '/events',
    };
  }
  return { kind: 'pass_ready', label: 'Your pass is ready', href: '#venue-pass' };
}
