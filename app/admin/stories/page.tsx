'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin-shell';

type AdminStory = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  author_name: string | null;
  review_note: string | null;
};

type Tab = 'pending' | 'published' | 'rejected';

export default function AdminStoriesPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<AdminStory[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`/api/admin/stories?status=${tab}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not load queue');
        return;
      }
      setRows(payload.stories || []);
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
      const res = await fetch(`/api/admin/stories/${id}`, {
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
    <AdminShell title="Stories">
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-label-sm capitalize cursor-pointer ${
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
        <p className="text-body-sm text-on-surface-variant">No {tab} stories.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((s) => (
            <li key={s.id} className="rounded-2xl border border-outline-variant bg-surface-paper p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                <h3 className="text-headline-sm text-primary">{s.title}</h3>
                {s.author_name && (
                  <span className="text-body-sm text-on-surface-variant">by {s.author_name}</span>
                )}
                <span className="text-body-sm text-on-surface-variant">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant whitespace-pre-line max-w-3xl">
                {s.body}
              </p>
              {s.review_note && tab === 'rejected' && (
                <p className="text-body-sm text-error mt-2">Note: {s.review_note}</p>
              )}
              {tab === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => void decide(s.id, 'published')}
                    className="rounded-lg bg-primary text-on-primary px-4 py-2 text-label-sm font-bold disabled:opacity-60 cursor-pointer"
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => void decide(s.id, 'rejected')}
                    className="rounded-lg border border-error/40 text-error px-4 py-2 text-label-sm font-bold disabled:opacity-60 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
