'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminShell from '@/components/admin-shell';
import AdminEventForm from '@/components/admin-event-form';
import type { EventCatalog } from '@/lib/events/types';

export default function AdminEditEventPage() {
  const params = useParams();
  const id = String(params.id || '');
  const [event, setEvent] = useState<EventCatalog | null>(null);
  const [error, setError] = useState('Loading…');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`/api/admin/events/${id}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Not found');
        setEvent(null);
        return;
      }
      setEvent(payload as EventCatalog);
      setError('');
    })();
  }, [id]);

  return (
    <AdminShell title="Edit event">
      {error && !event && (
        <p className="rounded-xl border border-jubilee-gold-light bg-secondary-container/30 p-4 text-body-sm text-on-secondary-fixed-variant">
          {error}
        </p>
      )}
      {event && <AdminEventForm event={event} />}
    </AdminShell>
  );
}
