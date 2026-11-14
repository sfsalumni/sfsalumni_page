'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DAY1_PORTAL_MENU,
  homeLanesVisible,
  type PortalMenuFlags,
} from '@/lib/portal-menu/menu';

/** Events stays in the sidebar only — not repeated as a home card. */
const lanes: { href: string; title: string; body: string; icon: string; flag?: keyof PortalMenuFlags }[] =
  [
    {
      href: '/memories',
      title: 'Memories',
      body: 'Browse published photos from your batch and all SFS.',
      icon: 'photo_library',
      flag: 'show_memories',
    },
  ];

export default function HomeDestinationLanes() {
  const [menu, setMenu] = useState<PortalMenuFlags>(DAY1_PORTAL_MENU);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/portal-menu', { cache: 'no-store' });
        if (!active) return;
        if (res.ok) {
          const payload = (await res.json()) as { menu?: PortalMenuFlags };
          if (payload.menu) setMenu(payload.menu);
        }
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!ready || !homeLanesVisible(menu)) return null;

  const visible = lanes.filter((lane) => {
    if (!lane.flag) return true;
    return menu[lane.flag];
  });
  if (!visible.length) return null;

  return (
    <section className="mt-8 space-y-3" aria-label="Explore the portal">
      {visible.map((lane) => (
        <Link
          key={lane.href}
          href={lane.href}
          className="group flex items-center gap-4 sm:gap-5 rounded-2xl border border-outline-variant bg-surface-paper px-5 py-5 sm:px-6 transition-transform duration-200 hover:-translate-y-0.5 hover:border-jubilee-gold-deep/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-3xl text-jubilee-gold-deep shrink-0">
            {lane.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-headline-sm text-primary group-hover:underline group-hover:decoration-jubilee-gold-deep group-hover:underline-offset-4">
              {lane.title}
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">{lane.body}</p>
          </div>
          <span className="text-label-md text-primary font-bold shrink-0">{lane.title} ↗</span>
        </Link>
      ))}
    </section>
  );
}
