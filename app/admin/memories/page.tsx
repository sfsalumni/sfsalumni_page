'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin-shell';

type AdminMemory = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  batch_year: number | null;
  batch_label: string | null;
  status: string;
  created_at: string;
  submitter_name: string | null;
  review_note: string | null;
};

type Tab = 'pending' | 'published' | 'rejected';

export default function AdminMemoriesPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<AdminMemory[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`/api/admin/memories?status=${tab}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not load queue');
        return;
      }
      setRows(payload.memories || []);
    } catch {
      setError('Could not load queue');
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, status: 'published' | 'rejected') {
    let review_note: string | undefined;
    if (status === 'rejected') {
      const note = window.prompt('Optional note for the member (reject reason):') ?? undefined;
      review_note = note?.trim() || undefined;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/memories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_note }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Update failed');
        return;
      }
      await load();
    } catch {
      setError('Update failed');
    } finally {
      setBusyId(null);
    }
  }

  const tabs: Tab[] = ['pending', 'published', 'rejected'];

  return (
    <AdminShell title="Memories">
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-label-sm capitalize ${
              tab === t ? 'bg-primary text-on-primary' : 'bg-surface-container text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-error-container bg-error-container/40 p-4 text-body-sm text-on-error-container mb-4">
          {error}
        </p>
      )}

      {!rows.length ? (
        <p className="text-body-sm text-on-surface-variant">No {tab} memories.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-outline-variant bg-white overflow-hidden flex flex-col sm:flex-row"
            >
              {m.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="sm:w-48 h-40 object-cover shrink-0 bg-primary/5"
                />
              ) : (
                <div className="sm:w-48 h-40 bg-primary/5 grid place-items-center shrink-0">
                  <span className="material-symbols-outlined text-4xl text-primary">photo</span>
                </div>
              )}
              <div className="p-4 flex-1 min-w-0">
                <p className="text-label-sm uppercase tracking-widest text-jubilee-gold-deep">
                  {m.batch_label || m.batch_year || 'General'}
                </p>
                <h3 className="text-headline-sm text-primary mt-1">{m.title}</h3>
                {m.description && (
                  <p className="text-body-sm text-on-surface-variant mt-1">{m.description}</p>
                )}
                <p className="text-body-sm text-on-surface-variant mt-2">
                  {m.submitter_name || 'Unknown'} · {new Date(m.created_at).toLocaleString()}
                </p>
                {tab === 'pending' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => void decide(m.id, 'published')}
                      className="rounded-full bg-primary text-on-primary px-4 py-2 text-label-sm font-bold disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => void decide(m.id, 'rejected')}
                      className="rounded-full border border-error/40 text-error px-4 py-2 text-label-sm font-bold disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
