'use client';

import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import AdminShell from '@/components/admin-shell';
import AdminBulkBar from '@/components/admin-tools/admin-bulk-bar';

type Account = {
  id: string;
  label: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  bank_name: string | null;
  upi_id: string | null;
  active: boolean;
  sort_order: number;
  deleted_at?: string | null;
};

type Proof = {
  id: string;
  source_type: string;
  registration_id: string | null;
  donation_id: string | null;
  amount_paise: number;
  utr: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  screenshot_url: string | null;
  donor_name: string;
  donor_email: string;
  payment_account_label: string | null;
};

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

const emptyForm = {
  label: '',
  account_name: '',
  account_number: '',
  ifsc: '',
  bank_name: '',
  upi_id: '',
  sort_order: '0',
  active: false,
};

export default function AdminPaymentAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewId, setReviewId] = useState<string | null>(null);
  const reviewTitleId = useId();

  const loadAccounts = useCallback(async () => {
    const res = await fetch('/api/admin/payment-accounts', { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || 'Could not load accounts');
    setAccounts(payload.accounts || []);
  }, []);

  const loadProofs = useCallback(async () => {
    const res = await fetch('/api/admin/offline-proofs?status=pending', { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || 'Could not load proofs');
    setProofs(payload.proofs || []);
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      await Promise.all([loadAccounts(), loadProofs()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    }
  }, [loadAccounts, loadProofs]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(a: Account) {
    setEditingId(a.id);
    setForm({
      label: a.label,
      account_name: a.account_name,
      account_number: a.account_number,
      ifsc: a.ifsc,
      bank_name: a.bank_name || '',
      upi_id: a.upi_id || '',
      sort_order: String(a.sort_order),
      active: a.active,
    });
    setOk('');
    setError('');
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      const body = {
        label: form.label,
        accountName: form.account_name,
        accountNumber: form.account_number,
        ifsc: form.ifsc,
        bankName: form.bank_name,
        upiId: form.upi_id,
        sortOrder: Number(form.sort_order) || 0,
        active: form.active,
      };
      const url = editingId
        ? `/api/admin/payment-accounts/${editingId}`
        : '/api/admin/payment-accounts';
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Save failed');
        return;
      }
      setOk(editingId ? 'Account updated.' : 'Account added.');
      startCreate();
      await loadAccounts();
    } catch {
      setError('Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function setActive(id: string) {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetch(`/api/admin/payment-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: true }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not activate');
        return;
      }
      setOk('Active account updated. Members will see these details.');
      await loadAccounts();
    } catch {
      setError('Could not activate');
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(a: Account) {
    const warn = a.active
      ? `Delete “${a.label}”? It stays in the list (soft delete) and is removed from checkout. Set another account active for offline pay.`
      : `Delete “${a.label}”? It stays in the list until you restore it.`;
    if (!window.confirm(warn)) return;

    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetch(`/api/admin/payment-accounts/${a.id}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not delete');
        return;
      }
      if (editingId === a.id) startCreate();
      setOk(
        payload.wasActive
          ? 'Account soft-deleted. Set another account active for offline payments.'
          : 'Account soft-deleted.'
      );
      await loadAccounts();
    } catch {
      setError('Could not delete');
    } finally {
      setBusy(false);
    }
  }

  async function restoreAccount(a: Account) {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetch(`/api/admin/payment-accounts/${a.id}/restore`, { method: 'POST' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not restore');
        return;
      }
      setOk('Account restored. Set it active if members should use it for offline pay.');
      await loadAccounts();
    } catch {
      setError('Could not restore');
    } finally {
      setBusy(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllProofs() {
    setSelected((prev) => {
      if (proofs.length > 0 && prev.size === proofs.length) return new Set();
      return new Set(proofs.map((p) => p.id));
    });
  }

  async function decideProof(id: string, status: 'approved' | 'rejected') {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetch(`/api/admin/offline-proofs/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not update proof');
        return;
      }
      setOk(status === 'approved' ? 'Proof approved — payment marked paid.' : 'Proof rejected.');
      setReviewId(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await loadProofs();
    } catch {
      setError('Could not update proof');
    } finally {
      setBusy(false);
    }
  }

  async function decideProofsBulk(status: 'approved' | 'rejected') {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetch('/api/admin/offline-proofs/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Bulk update failed');
        return;
      }
      const done = Number(payload.approved || 0) + Number(payload.rejected || 0);
      const failed = Number(payload.failed || 0);
      setOk(
        failed > 0
          ? `${done} updated, ${failed} failed.`
          : status === 'approved'
            ? `${done} proofs approved — payments marked paid.`
            : `${done} proofs rejected.`
      );
      setSelected(new Set());
      setReviewId(null);
      await loadProofs();
    } catch {
      setError('Bulk update failed');
    } finally {
      setBusy(false);
    }
  }

  const reviewProof = proofs.find((p) => p.id === reviewId) || null;

  return (
    <AdminShell title="Bank / UPI">
      <p className="text-body-sm text-on-surface-variant mb-6 max-w-3xl">
        Review Bank / UPI remittance proofs first, then manage the single active payout account
        members see at checkout.
      </p>

      <section className="rounded-2xl border border-outline-variant bg-white p-5 space-y-4 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-headline-sm text-primary">Pending proofs</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Open a proof to check UTR and screenshot. Approve marks paid; reject leaves unpaid.
              Select several for bulk approve or reject.
            </p>
          </div>
          {proofs.length > 0 ? (
            <label className="inline-flex items-center gap-2 text-body-sm text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === proofs.length}
                onChange={toggleSelectAllProofs}
                disabled={busy}
              />
              Select all ({proofs.length})
            </label>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-lg bg-error-container text-error text-body-sm p-3">{error}</p>
        ) : null}
        {ok ? (
          <p className="rounded-lg bg-secondary-container text-on-secondary-fixed text-body-sm p-3">
            {ok}
          </p>
        ) : null}

        {proofs.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant py-4">No pending submissions.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {proofs.map((p) => {
              const checked = selected.has(p.id);
              return (
                <li
                  key={p.id}
                  className={`rounded-xl border p-4 space-y-3 ${
                    checked ? 'border-primary bg-secondary-container/20' : 'border-outline-variant'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelected(p.id)}
                      disabled={busy}
                      aria-label={`Select proof from ${p.donor_name}`}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-medium text-primary truncate">
                        {p.donor_name}
                      </p>
                      <p className="text-headline-sm text-primary tabular-nums mt-0.5">
                        {formatInr(p.amount_paise)}
                      </p>
                      <p className="text-label-sm text-on-surface-variant mt-1 truncate">
                        {p.donor_email}
                      </p>
                      <p className="text-label-sm text-on-surface-variant">
                        {p.source_type}
                        {p.payment_account_label ? ` · ${p.payment_account_label}` : ''}
                      </p>
                      {p.utr ? (
                        <p className="text-body-sm text-on-surface mt-2">
                          UTR <span className="tabular-nums font-medium">{p.utr}</span>
                        </p>
                      ) : (
                        <p className="text-body-sm text-on-surface-variant mt-2">No UTR · screenshot only</p>
                      )}
                    </div>
                  </div>
                  {p.screenshot_url ? (
                    <button
                      type="button"
                      onClick={() => setReviewId(p.id)}
                      className="block w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-ivory focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.screenshot_url}
                        alt=""
                        className="h-28 w-full object-cover object-top"
                      />
                    </button>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setReviewId(p.id)}
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decideProof(p.id, 'approved')}
                      className="rounded-lg bg-primary text-on-primary px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decideProof(p.id, 'rejected')}
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <AdminBulkBar count={selected.size} busy={busy} onClear={() => setSelected(new Set())}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void decideProofsBulk('approved')}
            className="rounded-lg bg-primary text-on-primary px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            Approve selected
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void decideProofsBulk('rejected')}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            Reject selected
          </button>
        </AdminBulkBar>
      </section>

      {reviewProof ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-6"
          role="presentation"
          onClick={() => !busy && setReviewId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={reviewTitleId}
            className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface-paper border border-outline-variant shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id={reviewTitleId} className="text-headline-sm text-primary">
                  Review remittance
                </h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  {reviewProof.donor_name} · {formatInr(reviewProof.amount_paise)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setReviewId(null)}
                className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm cursor-pointer"
              >
                Close
              </button>
            </div>
            <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
              <div>
                <dt className="text-label-sm uppercase tracking-wider text-on-surface-variant">Email</dt>
                <dd className="text-primary">{reviewProof.donor_email}</dd>
              </div>
              <div>
                <dt className="text-label-sm uppercase tracking-wider text-on-surface-variant">Source</dt>
                <dd className="text-primary capitalize">{reviewProof.source_type}</dd>
              </div>
              <div>
                <dt className="text-label-sm uppercase tracking-wider text-on-surface-variant">UTR</dt>
                <dd className="text-primary tabular-nums">{reviewProof.utr || '—'}</dd>
              </div>
              <div>
                <dt className="text-label-sm uppercase tracking-wider text-on-surface-variant">Account</dt>
                <dd className="text-primary">{reviewProof.payment_account_label || '—'}</dd>
              </div>
            </dl>
            {reviewProof.screenshot_url ? (
              <a
                href={reviewProof.screenshot_url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reviewProof.screenshot_url}
                  alt="Payment screenshot"
                  className="w-full max-h-[50vh] object-contain bg-surface-ivory"
                />
              </a>
            ) : (
              <p className="rounded-lg bg-surface-ivory p-4 text-body-sm text-on-surface-variant">
                No screenshot on file — rely on UTR / bank statement.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => void decideProof(reviewProof.id, 'approved')}
                className="rounded-lg bg-primary text-on-primary px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                Approve & mark paid
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decideProof(reviewProof.id, 'rejected')}
                className="rounded-lg border border-outline-variant px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-1 max-w-3xl">
        <section className="rounded-2xl border border-outline-variant bg-white p-5 space-y-4 h-fit">
          <div>
            <h3 className="text-headline-sm text-primary">Payment accounts</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              IFSC + account number for NEFT/IMPS, and optional UPI ID for QR scan. Only one account
              can be active.
            </p>
          </div>

          <form onSubmit={onSave} className="space-y-3">
            <h4 className="text-label-md text-primary uppercase tracking-wider">
              {editingId ? 'Edit account' : 'Add account'}
            </h4>
            {(
              [
                ['label', 'Label', 'e.g. Jubilee event fees'],
                ['account_name', 'Account holder name', ''],
                ['account_number', 'Account number', ''],
                ['ifsc', 'IFSC', 'SBIN0001234'],
                ['bank_name', 'Bank name (optional)', ''],
                ['upi_id', 'UPI ID (optional)', 'name@oksbi'],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="text-label-sm uppercase tracking-wider text-primary">{label}</span>
                <input
                  required={key !== 'bank_name' && key !== 'upi_id'}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  disabled={busy}
                  placeholder={placeholder}
                  className="mt-1 w-full px-4 py-3.5 rounded-lg border border-outline-variant text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            ))}
            <label className="block">
              <span className="text-label-sm uppercase tracking-wider text-primary">
                Display order
              </span>
              <input
                inputMode="numeric"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                disabled={busy}
                className="mt-1 w-full px-4 py-3.5 rounded-lg border border-outline-variant text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="flex items-center gap-2 text-body-sm text-primary font-medium">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                disabled={busy}
              />
              Set as the active account (deactivates others)
            </label>
            {error ? (
              <p className="rounded-lg bg-error-container text-error text-body-sm p-3">{error}</p>
            ) : null}
            {ok ? (
              <p className="rounded-lg bg-secondary-container text-on-secondary-fixed text-body-sm p-3">
                {ok}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary text-on-primary px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {busy ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={startCreate}
                  disabled={busy}
                  className="rounded-lg border border-outline-variant px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <ul className="divide-y divide-outline-variant border-t border-outline-variant pt-3">
            {accounts.length === 0 ? (
              <li className="py-3 text-body-sm text-on-surface-variant">No accounts yet.</li>
            ) : (
              accounts.map((a) => {
                const deleted = Boolean(a.deleted_at);
                return (
                  <li
                    key={a.id}
                    className={`py-3 flex flex-wrap items-start justify-between gap-3 ${
                      deleted ? 'opacity-50' : ''
                    }`}
                  >
                    <div className={deleted ? 'blur-[1px] select-none' : undefined}>
                      <p className="text-body-sm font-medium text-primary">
                        {a.label}{' '}
                        {deleted ? (
                          <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
                            Deleted
                          </span>
                        ) : a.active ? (
                          <span className="text-label-sm uppercase tracking-wider text-green-700">
                            Active
                          </span>
                        ) : null}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {a.account_name} · {a.account_number} · {a.ifsc}
                        {a.upi_id ? ` · ${a.upi_id}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {deleted ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void restoreAccount(a)}
                          className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        >
                          Restore
                        </button>
                      ) : (
                        <>
                          {!a.active ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void setActive(a.id)}
                              className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              Set active
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startEdit(a)}
                            className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void removeAccount(a)}
                            className="rounded-lg border border-error/40 text-error px-3 py-1.5 text-label-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-error disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
