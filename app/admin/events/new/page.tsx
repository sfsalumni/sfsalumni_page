'use client';

import AdminShell from '@/components/admin-shell';
import AdminEventForm from '@/components/admin-event-form';

export default function AdminNewEventPage() {
  return (
    <AdminShell title="New event">
      <AdminEventForm />
    </AdminShell>
  );
}
