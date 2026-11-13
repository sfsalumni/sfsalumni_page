'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/admin-shell';
import AdminBulkBar from '@/components/admin-tools/admin-bulk-bar';
import {
  MAINTENANCE_BULK_CONFIRM,
  type MaintenanceBulkScope,
  type MemberPurgeCounts,
} from '@/lib/admin/member-purge';

type MemberRow = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  batch: number | null;
  role: 'alumni' | 'admin';
  member_status: string;
  username: string | null;
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
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [meId, setMeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmWord, setConfirmWord] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadList = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      const res = await fetch(`/api/admin/maintenance/members?${params}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not load members');
        setMembers([]);
        return;
      }
      setError('');
      setMembers(Array.isArray(payload.members) ? payload.members : []);
      setMeId(String(payload.me_id || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadList(q);
    }, q.trim() ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, loadList]);

  useEffect(() => {
    setSelected(new Set());
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

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (members.length > 0 && prev.size === members.length) return new Set();
      return new Set(members.map((m) => m.id));
    });
  }

  async function runBulk(scope: MaintenanceBulkScope) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (confirmWord.trim() !== MAINTENANCE_BULK_CONFIRM) {
      setError(`Type ${MAINTENANCE_BULK_CONFIRM} in the confirm box before bulk delete.`);
      return;
    }
    const label =
      scope === 'registrations'
        ? `Delete all event registrations for ${ids.length} selected member(s)? Accounts stay.`
        : `Permanently delete ${ids.length} membership(s) and all related data? This cannot be undone.`;
    if (!window.confirm(label)) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/maintenance/members/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids, scope, confirm: MAINTENANCE_BULK_CONFIRM }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Bulk delete failed');
        return;
      }
      const ok = Number(payload.succeeded || 0);
      const skipped = Number(payload.skipped || 0);
      const failed = Number(payload.failed || 0);
      const scopeLabel = scope === 'registrations' ? 'registration wipe' : 'membership delete';
      setMessage(
        `${scopeLabel}: ${ok} ok` +
          (skipped ? `, ${skipped} skipped` : '') +
          (failed ? `, ${failed} failed` : '') +
          '.'
      );
      setSelected(new Set());
      setConfirmWord('');
      setPreview(null);
      await loadList(q);
    } finally {
      setBusy(false);
    }
  }

  async function onSingleMembershipDelete() {
    if (!preview) return;
    if (
      !window.confirm(
        `Permanently delete ${preview.member.full_name} and all related data? This cannot be undone.`
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
      await loadList(q);
    } finally {
      setBusy(false);
    }
  }

  const allSelected = members.length > 0 && selected.size === members.length;
  const selectedRows = useMemo(
    () => members.filter((m) => selected.has(m.id)),
    [members, selected]
  );
  const c = preview?.counts;

  return (
    <AdminShell title="Maintenance">
      <p className="text-body-sm text-on-surface-variant mb-6 max-w-3xl">
        Full member list with multi-select. Delete <strong>registrations only</strong> (account
        stays) or <strong>membership</strong> (hard wipe of the account and linked data). Type{' '}
        <code className="text-label-sm">{MAINTENANCE_BULK_CONFIRM}</code> to unlock bulk actions.
        Membership wipe skips you and other admins.
      </p>

      {error ? (
        <p className="rounded-lg bg-error-container text-error text-body-sm p-3 mb-4">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-secondary-container text-on-secondary-fixed text-body-sm p-3 mb-4">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-outline-variant bg-white p-5 space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
          <div>
            <h3 className="text-headline-sm text-primary">Members</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {loading ? 'Loading…' : `${members.length} shown`}
              {selected.size > 0 ? ` · ${selected.size} selected` : ''}
            </p>
          </div>
          <label className="block sm:w-72">
            <span className="text-label-sm uppercase tracking-wider text-primary">Filter</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone, username…"
              className="mt-1 w-full px-4 py-3 rounded-lg border border-outline-variant text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>

        <label className="block max-w-xs">
          <span className="text-label-sm uppercase tracking-wider text-primary">
            Bulk confirm (type {MAINTENANCE_BULK_CONFIRM})
          </span>
          <input
            value={confirmWord}
            onChange={(e) => setConfirmWord(e.target.value)}
            disabled={busy}
            autoComplete="off"
            placeholder={MAINTENANCE_BULK_CONFIRM}
            className="mt-1 w-full px-4 py-3 rounded-lg border border-outline-variant text-body-sm focus:outline-none focus:ring-2 focus:ring-error"
          />
        </label>

        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-primary text-label-sm text-secondary-container">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={members.length === 0 || busy}
                    aria-label="Select all members"
                  />
                </th>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium hidden sm:table-cell">Batch</th>
                <th className="px-3 py-3 font-medium hidden md:table-cell">Role / status</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-on-surface-variant">
                    No members match.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isMe = m.id === meId;
                  return (
                    <tr
                      key={m.id}
                      className="border-t border-outline-variant/70 odd:bg-surface-ivory/60 align-top"
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(m.id)}
                          onChange={() => toggleSelected(m.id)}
                          disabled={busy}
                          aria-label={`Select ${m.full_name}`}
                        />
                      </td>
                      <td className="px-3 py-3 min-w-0">
                        <div className="font-medium text-primary truncate">
                          {m.full_name}
                          {isMe ? ' (you)' : ''}
                        </div>
                        <div className="text-label-sm text-on-surface-variant truncate">{m.email}</div>
                      </td>
                      <td className="px-3 py-3 tabular-nums hidden sm:table-cell">
                        {m.batch ?? '—'}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-on-surface-variant">
                        {m.role} · {m.member_status}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void loadPreview(m.id)}
                          className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminBulkBar count={selected.size} busy={busy} onClear={() => setSelected(new Set())}>
          <button
            type="button"
            disabled={busy || selectedRows.length === 0}
            onClick={() => void runBulk('registrations')}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            Delete registrations
          </button>
          <button
            type="button"
            disabled={busy || selectedRows.length === 0}
            onClick={() => void runBulk('membership')}
            className="rounded-lg bg-error text-white px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            Delete memberships
          </button>
        </AdminBulkBar>
      </section>

      {preview ? (
        <section className="rounded-2xl border border-error/30 bg-white p-5 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-headline-sm text-error">Review wipe</h3>
              <p className="text-body-sm text-on-surface mt-1 font-medium">
                {preview.member.full_name}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                {preview.member.email}
                {preview.member.batch != null ? ` · Batch ${preview.member.batch}` : ''} ·{' '}
                {preview.member.role} · {preview.member.member_status}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(null)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm cursor-pointer"
            >
              Close
            </button>
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
                  Type email to delete membership
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
                onClick={() => void onSingleMembershipDelete()}
                className="rounded-lg bg-error text-white px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-error"
              >
                {busy ? 'Deleting…' : 'Permanently delete membership'}
              </button>
            </>
          )}
        </section>
      ) : null}
    </AdminShell>
  );
}
