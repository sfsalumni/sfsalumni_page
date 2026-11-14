'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import AdminShell from '@/components/admin-shell';

export default function AdminImportPage() {
  const [rosterBusy, setRosterBusy] = useState(false);
  const [rosterClearBusy, setRosterClearBusy] = useState(false);
  const [rosterMessage, setRosterMessage] = useState('');
  const [rosterCount, setRosterCount] = useState<number | null>(null);
  const [rosterSummary, setRosterSummary] = useState<{
    upserted: number;
    skipped: number;
    total: number;
  } | null>(null);
  const [rosterFileKey, setRosterFileKey] = useState(0);
  const rosterInFlight = useRef(false);
  const rosterClearInFlight = useRef(false);

  async function refreshRosterCount() {
    const res = await fetch('/api/admin/import');
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRosterMessage(payload.error || 'Could not read roster count.');
      return;
    }
    setRosterCount(Number(payload.count) || 0);
  }

  useEffect(() => {
    void refreshRosterCount();
  }, []);

  async function uploadRoster(file: File) {
    if (rosterInFlight.current) return;
    rosterInFlight.current = true;
    setRosterBusy(true);
    setRosterMessage('');
    setRosterSummary(null);
    try {
      const body = new FormData();
      body.set('kind', 'roster');
      body.set('file', file);
      const res = await fetch('/api/admin/import', { method: 'POST', body });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRosterMessage(payload.error || 'Could not import the member roster.');
        return;
      }
      setRosterSummary({
        upserted: Number(payload.upserted) || 0,
        skipped: Number(payload.skipped) || 0,
        total: Number(payload.total) || 0,
      });
      await refreshRosterCount();
    } finally {
      rosterInFlight.current = false;
      setRosterBusy(false);
      setRosterFileKey((key) => key + 1);
    }
  }

  async function clearRoster() {
    if (rosterClearInFlight.current) return;
    const n = rosterCount ?? 0;
    const ok = window.confirm(
      n > 0
        ? `Delete all ${n} roster rows? Lookup will stop working until you re-import.`
        : 'Roster is already empty. Clear anyway?'
    );
    if (!ok) return;
    rosterClearInFlight.current = true;
    setRosterClearBusy(true);
    setRosterMessage('');
    try {
      const res = await fetch('/api/admin/import', { method: 'DELETE' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRosterMessage(payload.error || 'Could not clear the member roster.');
        return;
      }
      const deleted = Number(payload.deleted) || 0;
      setRosterCount(0);
      setRosterSummary(null);
      setRosterMessage(
        payload.message ||
          (deleted === 0
            ? 'Roster is already empty.'
            : deleted === 1
              ? 'Cleared 1 roster row.'
              : `Cleared ${deleted} roster rows.`)
      );
    } finally {
      rosterClearInFlight.current = false;
      setRosterClearBusy(false);
    }
  }

  function onSubmitRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = (event.currentTarget.elements.namedItem('roster_file') as HTMLInputElement)
      .files?.[0];
    if (!file) {
      setRosterMessage('Choose sfs1.xlsx (or another workbook with Unique Records).');
      return;
    }
    void uploadRoster(file);
  }

  return (
    <AdminShell title="Import roster">
      <section className="max-w-2xl space-y-4">
        <h2 className="text-headline-sm text-primary">Registration roster (prefill)</h2>
        <p className="text-body-sm text-navy-subtle">
          Upload <span className="font-medium text-primary">sfs1.xlsx</span> and we read the{' '}
          <span className="font-medium text-primary">Unique Records</span> sheet into the member
          roster. During event registration, matching phone / email / name prefills the form. This
          does not create login accounts.
        </p>
        <form onSubmit={onSubmitRoster} className="space-y-4">
          <label className="block" htmlFor="roster-workbook">
            <span className="block text-label-sm uppercase tracking-wider text-primary mb-2">
              Workbook with Unique Records
            </span>
            <input
              key={rosterFileKey}
              id="roster-workbook"
              name="roster_file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="block w-full text-body-sm text-navy-subtle file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-label-sm file:text-on-primary file:cursor-pointer"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={rosterBusy || rosterClearBusy}
              className="rounded-lg bg-primary text-on-primary px-5 py-3 text-label-md uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {rosterBusy ? 'Importing roster…' : 'Import registration roster'}
            </button>
            <button
              type="button"
              onClick={() => void clearRoster()}
              disabled={rosterBusy || rosterClearBusy}
              className="rounded-lg border border-error/40 bg-surface-ivory px-5 py-3 text-label-md uppercase tracking-wider text-error disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-error-container/40"
            >
              {rosterClearBusy ? 'Clearing…' : 'Clear roster'}
            </button>
          </div>
        </form>
        <p className="text-body-sm text-navy-subtle" role="status">
          {rosterCount === null
            ? 'Counting roster rows…'
            : rosterCount === 0
              ? 'Roster is empty.'
              : `${rosterCount} roster rows loaded.`}
        </p>
        {rosterMessage && (
          <p
            role="status"
            className={
              rosterMessage.startsWith('Cleared') || rosterMessage.startsWith('Roster is already')
                ? 'rounded-xl border border-primary/15 bg-surface-ivory p-4 text-body-sm text-primary'
                : 'rounded-xl border border-error/30 bg-error-container p-4 text-body-sm text-error'
            }
          >
            {rosterMessage}
          </p>
        )}
        {rosterSummary && (
          <p
            role="status"
            className="rounded-xl border border-primary/15 bg-surface-ivory p-4 text-body-sm text-primary"
          >
            Saved {rosterSummary.upserted} roster rows from {rosterSummary.total} Unique Records
            {rosterSummary.skipped ? ` (${rosterSummary.skipped} skipped)` : ''}. Registration can
            prefill from this data.
          </p>
        )}
      </section>
    </AdminShell>
  );
}
