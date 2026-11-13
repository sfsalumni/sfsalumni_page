'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin-shell';
import type { MemberPurgeCounts } from '@/lib/admin/member-purge';

type SearchHit = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  batch: number | null;
  role: 'alumni' | 'admin';
  member_status: string;
  created_at: string;
};

type Preview = {
  member: {
    id: string;
    full_name: string;
    email: string;
    username: string | null;
    batch: number | null;
    role: string;
    member_status: string;
    created_at: string;
  };
  counts: MemberPurgeCounts;
  can_delete: boolean;
  block_reason: string | null;
};

export default function AdminMaintenancePage() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        if (!q.trim()) {
          setHits([]);
          return;
        }
        setLoadingSearch(true);
        try {
          const params = new URLSearchParams({ q: q.trim() });
          const res = await fetch(`/api/admin/members?${params}`, { cache: 'no-store' });
          const payload = await res.json().catch(() => []);
          if (!res.ok) {
            setError(payload.error || 'Search failed');
            setHits([]);
            return;
          }
          setError('');
          setHits(Array.isArray(payload) ? payload : []);
        } finally {
          setLoadingSearch(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const loadPreview = useCallback(async (id: string) => {
    setBusy(true);
    setError('');
    setMessage('');
    setConfirmEmail('');
    try {
      const res = await fetch(`/api/admin/maintenance/members/${id}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreview(null);
        setError(payload.error || 'Could not load member');
        return;
      }
      setPreview(payload as Preview);
    } finally {
      setBusy(false);
    }
  }, []);

  async function onDelete() {
    if (!preview) return;
    if (
      !window.confirm(
        `Permanently delete ${preview.member.full_name} and all related registrations, donations, proofs, and stories? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/maintenance/members/${preview.member.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmEmail }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Delete failed');
        return;
      }
      setMessage(
        `Deleted ${payload.deleted?.full_name || 'member'} (${payload.deleted?.email || ''}).`
      );
      setPreview(null);
      setConfirmEmail('');
      setHits((prev) => prev.filter((h) => h.id !== payload.deleted?.id));
    } finally {
      setBusy(false);
    }
  }

  const c = preview?.counts;

  return (
    <AdminShell title="Maintenance">
      <p className="text-body-sm text-on-surface-variant mb-6 max-w-3xl">
        Hard-delete a member and associated records (registrations, donations, offline proofs,
        stories, push subscriptions). Memories keep the photo but drop the submitter link. Admins
        must be demoted to alumni first. You cannot delete your own account.
      </p>

      {error ? (
        <p className="rounded-lg bg-error-container text-error text-body-sm p-3 mb-4">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-secondary-container text-on-secondary-fixed text-body-sm p-3 mb-4">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-outline-variant bg-white p-5 space-y-4 mb-8 max-w-3xl">
        <div>
          <h3 className="text-headline-sm text-primary">Find member</h3>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Search by name, email, or phone.
          </p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, email, or phone…"
          className="w-full px-4 py-3.5 rounded-lg border border-outline-variant text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {loadingSearch ? (
          <p className="text-body-sm text-on-surface-variant">Searching…</p>
        ) : null}
        {q.trim() && !loadingSearch && hits.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No matches.</p>
        ) : null}
        <ul className="divide-y divide-outline-variant">
          {hits.map((h) => (
            <li key={h.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-primary truncate">{h.full_name}</p>
                <p className="text-label-sm text-on-surface-variant truncate">
                  {h.email}
                  {h.batch != null ? ` · Batch ${h.batch}` : ''} · {h.role} · {h.member_status}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void loadPreview(h.id)}
                className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Review wipe
              </button>
            </li>
          ))}
        </ul>
      </section>

      {preview ? (
        <section className="rounded-2xl border border-error/30 bg-white p-5 space-y-4 max-w-3xl">
          <div>
            <h3 className="text-headline-sm text-error">Delete member</h3>
            <p className="text-body-sm text-on-surface mt-1 font-medium">
              {preview.member.full_name}
            </p>
            <p className="text-body-sm text-on-surface-variant">
              {preview.member.email}
              {preview.member.username ? ` · @${preview.member.username}` : ''}
              {preview.member.batch != null ? ` · Batch ${preview.member.batch}` : ''} ·{' '}
              {preview.member.role} · {preview.member.member_status}
            </p>
          </div>

          {c ? (
            <ul className="grid gap-2 sm:grid-cols-2 text-body-sm">
              <li className="rounded-lg bg-surface-ivory px-3 py-2">
                Registrations: <span className="tabular-nums font-medium">{c.registrations}</span>
              </li>
              <li className="rounded-lg bg-surface-ivory px-3 py-2">
                Donations: <span className="tabular-nums font-medium">{c.donations}</span>
              </li>
              <li className="rounded-lg bg-surface-ivory px-3 py-2">
                Offline proofs: <span className="tabular-nums font-medium">{c.offline_proofs}</span>
              </li>
              <li className="rounded-lg bg-surface-ivory px-3 py-2">
                Stories: <span className="tabular-nums font-medium">{c.stories}</span>
              </li>
              <li className="rounded-lg bg-surface-ivory px-3 py-2">
                Memories (unlink): <span className="tabular-nums font-medium">{c.memories}</span>
              </li>
              <li className="rounded-lg bg-surface-ivory px-3 py-2">
                Push subscriptions:{' '}
                <span className="tabular-nums font-medium">{c.push_subscriptions}</span>
              </li>
            </ul>
          ) : null}

          {!preview.can_delete && preview.block_reason ? (
            <p className="rounded-lg bg-error-container text-error text-body-sm p-3">
              {preview.block_reason}
            </p>
          ) : (
            <>
              <label className="block">
                <span className="text-label-sm uppercase tracking-wider text-primary">
                  Type email to confirm
                </span>
                <input
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  disabled={busy}
                  placeholder={preview.member.email}
                  autoComplete="off"
                  className="mt-1 w-full px-4 py-3.5 rounded-lg border border-outline-variant text-body-sm focus:outline-none focus:ring-2 focus:ring-error"
                />
              </label>
              <button
                type="button"
                disabled={busy || !confirmEmail.trim()}
                onClick={() => void onDelete()}
                className="rounded-lg bg-error text-white px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-error"
              >
                {busy ? 'Deleting…' : 'Permanently delete member'}
              </button>
            </>
          )}
        </section>
      ) : null}
    </AdminShell>
  );
}
