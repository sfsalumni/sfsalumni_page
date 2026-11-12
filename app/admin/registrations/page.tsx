import { Suspense } from 'react';
import AdminRegistrationsInner from './inner';

export default function AdminRegistrationsPage() {
  return (
    <Suspense
      fallback={
        <p className="text-body-sm text-on-surface-variant p-6">Loading registrations…</p>
      }
    >
      <AdminRegistrationsInner />
    </Suspense>
  );
}
