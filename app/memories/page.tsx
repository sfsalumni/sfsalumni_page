'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import MemberGate from '@/components/member-gate';
import MemoryPhotoStrip, { type MemoryCardItem } from '@/components/memory-photo-strip';
import PortalShell from '@/components/portal-shell';

export default function MemoriesPage() {
  const [ownBatch, setOwnBatch] = useState<MemoryCardItem[]>([]);
  const [allSfs, setAllSfs] = useState<MemoryCardItem[]>([]);
  const [message, setMessage] = useState('Loading memories…');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/memories', { cache: 'no-store' });
        if (!active) return;
        if (!res.ok) {
          setMessage('Could not load the archive yet.');
          return;
        }
        const data = await res.json();
        setOwnBatch(data.ownBatch || []);
        setAllSfs(data.allSfs || []);
        setMessage('');
      } catch {
        if (active) setMessage('Archive is not configured yet.');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PortalShell
      title="Our memories, kept together"
      eyebrow="SFS MEMORY ARCHIVE"
      intro="Your batch first, then all SFS — photos the committee has published."
    >
      <MemberGate>
        {message && (
          <p className="rounded-xl bg-white border border-outline-variant p-5 text-body-sm text-on-surface-variant mb-6">
            {message}
          </p>
        )}

        <MemoryPhotoStrip
          label="Your batch"
          emptyText="No memories from your batch yet."
          items={ownBatch}
        />
        <MemoryPhotoStrip
          label="All SFS"
          emptyText="No published memories yet."
          items={allSfs}
        />

        <p className="mt-2 text-body-sm text-on-surface-variant">
          Want to contribute a photo?{' '}
          <Link href="/submissions#share" className="text-primary font-bold underline underline-offset-2">
            Share a memory on My submissions
          </Link>
        </p>
      </MemberGate>
    </PortalShell>
  );
}
