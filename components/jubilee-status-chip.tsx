'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { JubileeRegStatus } from '@/lib/jubilee-cta';

const COPY: Record<
  JubileeRegStatus,
  { label: string; hint: string; href?: string; hrefLabel?: string }
> = {
  none: {
    label: 'Not registered',
    hint: 'Secure your place at the Golden Jubilee reunion.',
    href: '/registration',
    hrefLabel: 'Register',
  },
  pending_payment: {
    label: 'Payment pending',
    hint: 'Your details are saved — complete payment to confirm.',
    href: '/registration',
    hrefLabel: 'Complete payment',
  },
  paid: {
    label: 'Registered · paid',
    hint: 'You’re confirmed. Open your registration if you need to change how many people are coming.',
    href: '/registration',
    hrefLabel: 'Update registration',
  },
};

export default function JubileeStatusChip() {
  const [status, setStatus] = useState<JubileeRegStatus | null>(null);
  const [role, setRole] = useState<'alumni' | 'admin' | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!active || !res.ok) return;
        const me = await res.json();
        if (!active) return;
        setRole(me.role);
        setStatus((me.jubilee_reg_status as JubileeRegStatus) || 'none');
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!status || role === 'admin') return null;
  const copy = COPY[status];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-outline-variant bg-white px-5 py-4 shadow-sm">
      <span className="material-symbols-outlined text-2xl text-jubilee-gold-deep">
        {status === 'paid' ? 'confirmation_number' : 'event'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-label-md text-primary font-bold">{copy.label}</div>
        <p className="text-body-sm text-on-surface-variant">{copy.hint}</p>
      </div>
      {copy.href ? (
        <Link
          href={copy.href}
          className="inline-flex items-center rounded-lg bg-secondary-container px-4 py-2 text-label-sm uppercase tracking-wider text-on-secondary-fixed"
        >
          {copy.hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}
