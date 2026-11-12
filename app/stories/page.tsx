'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import MemberGate from '@/components/member-gate';
import PortalShell from '@/components/portal-shell';

type Story = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export default function StoriesPage() {
  const [rows, setRows] = useState<Story[]>([]);
  const [message, setMessage] = useState('Loading alumni stories…');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/stories', { cache: 'no-store' });
        if (!active) return;
        if (!res.ok) {
          setMessage('Could not load stories yet.');
          return;
        }
        const data = await res.json();
        setRows(data.stories || []);
        setMessage((data.stories || []).length ? '' : 'No stories have been published yet.');
      } catch {
        if (active) setMessage('Stories are not configured yet.');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PortalShell
      title="Stories that stay with us"
      eyebrow="ALUMNI VOICES"
      intro="Published voices from the SFS family. Submit your own from My submissions."
    >
      <MemberGate>
        <p className="mb-8 text-body-sm text-on-surface-variant">
          Want to contribute?{' '}
          <Link
            href="/submissions#share-story"
            className="text-primary font-bold underline underline-offset-2"
          >
            Share a story on My submissions
          </Link>
          .
        </p>

        <h2 className="text-headline-sm text-primary mb-3">Published stories</h2>
        {message && (
          <p className="rounded-xl bg-white border border-outline-variant p-5 text-body-sm text-on-surface-variant">
            {message}
          </p>
        )}
        <ul className="divide-y divide-outline-variant">
          {rows.map((s) => (
            <li key={s.id} className="py-6">
              <p className="text-label-sm uppercase tracking-widest text-jubilee-gold-deep">
                {new Date(s.created_at).toLocaleDateString('en-IN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <h3 className="text-headline-sm text-primary mt-2">{s.title}</h3>
              <p className="text-body-sm text-on-surface-variant mt-3 whitespace-pre-line max-w-3xl">
                {s.body}
              </p>
            </li>
          ))}
        </ul>
      </MemberGate>
    </PortalShell>
  );
}
