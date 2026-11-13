'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy path — Bank / UPI lives at /admin/payment-accounts. */
export default function AdminPaymentsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/payment-accounts');
  }, [router]);
  return (
    <p className="text-body-sm text-on-surface-variant p-6">Redirecting to Bank / UPI…</p>
  );
}
