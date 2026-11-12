'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { registrationPath } from '@/lib/events/choose-event';
import { jubileeCta, jubileeNavCta, type JubileeAccountHint } from '@/lib/jubilee-cta';

type Variant = 'nav' | 'hero' | 'inline';

const styles: Record<Variant, string> = {
  nav: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-container hover:bg-secondary-fixed text-on-secondary-fixed text-label-md uppercase tracking-wider shadow-sm transition-all',
  hero: 'inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-secondary-container hover:bg-secondary-fixed-dim text-on-secondary-fixed text-label-md uppercase tracking-wider shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5',
  inline:
    'inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-surface-paper hover:bg-surface-container text-primary text-label-md uppercase tracking-wider shadow-sm transition-all border border-surface-container-highest',
};

export default function JubileeRegisterLink({
  variant = 'nav',
  className = '',
}: {
  variant?: Variant;
  className?: string;
}) {
  const [account, setAccount] = useState<JubileeAccountHint | null | undefined>(undefined);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!active) return;
        if (!res.ok) {
          setAccount(null);
          return;
        }
        const me = await res.json();
        setAccount({
          role: me.role,
          jubilee_reg_status: me.jubilee_reg_status || 'none',
        });
      } catch {
        if (active) setAccount(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/events', { cache: 'no-store' });
        if (!active || !res.ok) return;
        const rows = (await res.json()) as { id?: string }[];
        if (!active || !Array.isArray(rows)) return;
        setEventIds(rows.map((row) => String(row.id || '')).filter(Boolean));
      } catch {
        if (active) setEventIds([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [pathname]);

  // Wait for /me so admins never flash a Register CTA
  if (account === undefined) return null;
  const cta = variant === 'nav' ? jubileeNavCta(account) : jubileeCta(account);
  if (!cta.show) return null;
  let href = cta.href;
  if (href === '/registration' && eventIds.length === 1) href = registrationPath(eventIds[0]);

  return (
    <Link href={href} className={`${styles[variant]} ${className}`.trim()}>
      <span className="material-symbols-outlined text-[18px]">
        {account?.jubilee_reg_status === 'paid' ? 'confirmation_number' : 'how_to_reg'}
      </span>
      {cta.label}
    </Link>
  );
}
