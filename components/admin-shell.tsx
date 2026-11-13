'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import GetAppDialog from '@/components/get-app-dialog';

type AdminNavLink = {
  href: string;
  label: string;
  icon: string;
  match?: 'exact' | 'prefix';
  /** Inactive icon color (Tailwind text class). */
  iconClass: string;
  /** Soft well behind the icon when inactive. */
  wellClass: string;
};

type AdminNavGroup = {
  id: string;
  label: string;
  links: AdminNavLink[];
};

const NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'day-of',
    label: 'Day of',
    links: [
      {
        href: '/admin',
        label: 'Overview',
        icon: 'space_dashboard',
        match: 'exact',
        iconClass: 'text-academic-teal',
        wellClass: 'bg-academic-teal/12',
      },
      {
        href: '/admin/event-ops',
        label: 'Event ops',
        icon: 'monitoring',
        iconClass: 'text-academic-teal',
        wellClass: 'bg-academic-teal/12',
      },
      {
        href: '/admin/approvals',
        label: 'Approvals',
        icon: 'fact_check',
        iconClass: 'text-academic-teal',
        wellClass: 'bg-academic-teal/12',
      },
      {
        href: '/admin/check-in',
        label: 'Check-in',
        icon: 'qr_code_scanner',
        iconClass: 'text-academic-teal',
        wellClass: 'bg-academic-teal/12',
      },
      {
        href: '/admin/broadcast',
        label: 'Broadcast',
        icon: 'campaign',
        iconClass: 'text-academic-teal',
        wellClass: 'bg-academic-teal/12',
      },
    ],
  },
  {
    id: 'events-people',
    label: 'Events & people',
    links: [
      {
        href: '/admin/events',
        label: 'Events',
        icon: 'event',
        iconClass: 'text-jubilee-gold-deep',
        wellClass: 'bg-jubilee-gold-light/80',
      },
      {
        href: '/admin/registrations',
        label: 'Registrations',
        icon: 'confirmation_number',
        iconClass: 'text-jubilee-gold-deep',
        wellClass: 'bg-jubilee-gold-light/80',
      },
      {
        href: '/admin/membership',
        label: 'Membership',
        icon: 'badge',
        iconClass: 'text-jubilee-gold-deep',
        wellClass: 'bg-jubilee-gold-light/80',
      },
      {
        href: '/admin/import',
        label: 'Import',
        icon: 'upload_file',
        iconClass: 'text-jubilee-gold-deep',
        wellClass: 'bg-jubilee-gold-light/80',
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    links: [
      {
        href: '/admin/memories',
        label: 'Memories',
        icon: 'photo_library',
        iconClass: 'text-primary',
        wellClass: 'bg-primary/8',
      },
      {
        href: '/admin/stories',
        label: 'Stories',
        icon: 'auto_stories',
        iconClass: 'text-primary',
        wellClass: 'bg-primary/8',
      },
      {
        href: '/admin/welcome',
        label: 'Welcome',
        icon: 'waving_hand',
        iconClass: 'text-primary',
        wellClass: 'bg-primary/8',
      },
      {
        href: '/admin/association',
        label: 'Association',
        icon: 'diversity_3',
        iconClass: 'text-primary',
        wellClass: 'bg-primary/8',
      },
      {
        href: '/admin/committee',
        label: 'Committee',
        icon: 'groups',
        iconClass: 'text-primary',
        wellClass: 'bg-primary/8',
      },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    links: [
      {
        href: '/admin/donations',
        label: 'Donate setup',
        icon: 'volunteer_activism',
        iconClass: 'text-jubilee-amber',
        wellClass: 'bg-jubilee-amber/12',
      },
      {
        href: '/admin/payment-accounts',
        label: 'Bank / UPI',
        icon: 'account_balance',
        iconClass: 'text-jubilee-amber',
        wellClass: 'bg-jubilee-amber/12',
      },
    ],
  },
];

function isActive(pathname: string, href: string, match: 'exact' | 'prefix' = 'prefix') {
  if (match === 'exact') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [getAppOpen, setGetAppOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <nav
        aria-label="Admin sections"
        className="print:hidden lg:w-60 shrink-0 flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 lg:pr-5 lg:border-r border-outline-variant"
      >
        {NAV_GROUPS.map((group, groupIndex) => (
          <div
            key={group.id}
            className={`flex lg:flex-col gap-1.5 shrink-0 ${
              groupIndex > 0 ? 'lg:mt-3 lg:pt-3 lg:border-t border-outline-variant/80' : ''
            }`}
          >
            <p className="hidden lg:block px-3.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-navy-subtle/70">
              {group.label}
            </p>
            {group.links.map((link) => {
              const active = isActive(pathname, link.href, link.match);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-label-sm transition-colors cursor-pointer ${
                    active
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-navy-subtle hover:bg-secondary-container/40 hover:text-primary'
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      active ? 'bg-on-primary/12' : link.wellClass
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        active ? 'text-secondary-fixed' : link.iconClass
                      }`}
                    >
                      {link.icon}
                    </span>
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="flex lg:flex-col gap-1.5 shrink-0 lg:mt-3 lg:pt-3 lg:border-t border-outline-variant/80">
          <button
            type="button"
            onClick={() => setGetAppOpen(true)}
            className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-label-sm text-navy-subtle hover:bg-secondary-container/40 hover:text-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary-container/60"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[18px] text-jubilee-gold-deep">
                install_mobile
              </span>
            </span>
            Get the app
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-label-sm text-error hover:bg-error-container/40 transition-colors cursor-pointer border border-error/20"
          >
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-error-container/70"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[18px] text-error">logout</span>
            </span>
            Logout
          </button>
        </div>
      </nav>
      <div className="min-w-0 flex-1">
        <div className="print:hidden mb-6 border-b border-outline-variant pb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-label-sm uppercase tracking-[0.16em] text-jubilee-gold-deep font-bold mb-1">
              Committee tools
            </p>
            <h2 className="text-headline-md text-primary">{title}</h2>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-label-sm uppercase tracking-wider text-error border border-error/30 hover:bg-error-container transition-colors cursor-pointer lg:hidden"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
        {children}
      </div>
      <GetAppDialog
        open={getAppOpen}
        onClose={() => setGetAppOpen(false)}
        startPath="/admin-app"
        appLabel="SFS Ops"
        eyebrow="SFS Ops"
        title="Get the ops app"
      />
    </div>
  );
}
