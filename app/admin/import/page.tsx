'use client';

import { FormEvent, useMemo, useRef, useState, type ChangeEvent } from 'react';
import AdminShell from '@/components/admin-shell';

type Line = {
  name: string;
  email: string;
  username: string;
  status: 'create' | 'existing' | 'duplicate' | 'failed' | 'skipped';
};

const STATUS_LABEL: Record<Line['status'], string> = {
  create: 'Created',
  existing: 'Already registered',
  duplicate: 'Repeated email',
  failed: 'Not saved',
  skipped: 'Skipped',
};

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function AdminImportPage() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rosterMessage, setRosterMessage] = useState('');
  const [rosterSummary, setRosterSummary] = useState<{
    upserted: number;
    skipped: number;
    total: number;
  } | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [created, setCreated] = useState(0);
  const [query, setQuery] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const [rosterFileKey, setRosterFileKey] = useState(0);
  const reupload = useRef(false);
  const inFlight = useRef(false);
  const rosterInFlight = useRef(false);

  const visible = useMemo(() => {
    if (!lines) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return lines;
    return lines.filter((line) =>
      `${line.name} ${line.username} ${line.email}`.toLowerCase().includes(needle)
    );
  }, [lines, query]);

  async function uploadAccounts(file: File) {
    if (inFlight.current) return;
    if (password.length < 8) {
      setMessage('Enter a password of at least 8 characters, then choose the workbook again.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      const body = new FormData();
      body.set('kind', 'accounts');
      body.set('file', file);
      body.set('password', password);
      const res = await fetch('/api/admin/import', { method: 'POST', body });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(payload.error || 'Could not import the workbook.');
        return;
      }
      setCreated(Number(payload.created) || 0);
      setLines(payload.lines as Line[]);
      setQuery('');
    } finally {
      inFlight.current = false;
      setBusy(false);
      setFileKey((key) => key + 1);
    }
  }

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
    } finally {
      rosterInFlight.current = false;
      setRosterBusy(false);
      setRosterFileKey((key) => key + 1);
    }
  }

  function onSubmitAccounts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = (event.currentTarget.elements.namedItem('file') as HTMLInputElement).files?.[0];
    if (!file) {
      setMessage('Choose the alumni workbook.');
      return;
    }
    void uploadAccounts(file);
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

  function download() {
    if (!lines) return;
    const header = ['Name', 'Username', 'Email', 'Result'];
    const body = lines.map((line) =>
      [line.name, line.username, line.email, STATUS_LABEL[line.status] || line.status]
        .map(csvCell)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...body].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'alumni-usernames.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell title="Import alumni">
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
          <button
            type="submit"
            disabled={rosterBusy}
            className="rounded-lg bg-primary text-on-primary px-5 py-3 text-label-md uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {rosterBusy ? 'Importing roster…' : 'Import registration roster'}
          </button>
        </form>
        {rosterMessage && (
          <p
            role="alert"
            className="rounded-xl border border-error/30 bg-error-container p-4 text-body-sm text-error"
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

      <hr className="my-10 max-w-2xl border-primary/10" />

      <form onSubmit={onSubmitAccounts} className="max-w-2xl space-y-4">
        <h2 className="text-headline-sm text-primary">Login accounts</h2>
        <p className="text-body-sm text-navy-subtle">
          Upload the alumni workbook, including a second time. New people are saved with the
          password below. People who already have an account keep their username and password. The
          username for each person is listed after every upload.
        </p>
        <label className="block" htmlFor="workbook">
          <span className="block text-label-sm uppercase tracking-wider text-primary mb-2">
            Alumni workbook
          </span>
          <input
            key={fileKey}
            id="workbook"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const picked = event.target.files?.[0];
              if (!picked || !reupload.current) return;
              reupload.current = false;
              void uploadAccounts(picked);
            }}
            className="block w-full text-body-sm text-navy-subtle file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-label-sm file:text-on-primary file:cursor-pointer"
          />
        </label>
        <label className="block" htmlFor="new-password">
          <span className="block text-label-sm uppercase tracking-wider text-primary mb-2">
            Password for new accounts
          </span>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full px-4 py-3.5 rounded-lg border border-primary/15 text-body-md bg-surface-ivory focus:outline-none focus-visible:ring-2 focus-visible:ring-jubilee-gold-deep"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary text-on-primary px-5 py-3 text-label-md uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy ? 'Uploading…' : 'Upload and assign usernames'}
        </button>
      </form>

      {message && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-error/30 bg-error-container p-4 text-body-sm text-error max-w-2xl"
        >
          {message}
        </p>
      )}

      {lines && (
        <section className="mt-8" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h3 className="text-headline-sm text-primary">Usernames</h3>
              <p className="text-body-sm text-navy-subtle mt-1">
                {created} created. {lines.length} people in the workbook.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  reupload.current = true;
                  const input = document.getElementById('workbook');
                  input?.scrollIntoView({ block: 'center' });
                  input?.click();
                }}
                className="rounded-lg bg-primary text-on-primary px-3 py-2 text-label-sm cursor-pointer hover:bg-primary-container"
              >
                Upload another workbook
              </button>
              <button
                type="button"
                onClick={download}
                className="rounded-lg border border-primary/20 bg-surface-ivory px-3 py-2 text-label-sm text-primary cursor-pointer hover:bg-secondary-container/30"
              >
                Download CSV
              </button>
            </div>
          </div>
          <label className="block max-w-md mb-4" htmlFor="find-person">
            <span className="sr-only">Find a person</span>
            <input
              id="find-person"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a person"
              className="w-full px-4 py-3.5 rounded-lg border border-primary/15 text-body-sm bg-surface-ivory focus:outline-none focus-visible:ring-2 focus-visible:ring-jubilee-gold-deep"
            />
          </label>
          <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-surface-paper shadow-sm">
            <table className="min-w-full text-left text-body-sm">
              <caption className="sr-only">Username assigned to each person in the workbook</caption>
              <thead className="bg-primary text-label-sm text-secondary-container">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Username
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-navy-subtle">
                      No one matches that search.
                    </td>
                  </tr>
                ) : (
                  visible.map((line, index) => (
                    <tr
                      key={`${line.email}-${line.name}-${index}`}
                      className="border-t border-primary/10"
                    >
                      <td className="px-4 py-3">{line.name}</td>
                      <td className="px-4 py-3 font-medium text-primary">
                        {line.username || '—'}
                      </td>
                      <td className="px-4 py-3 text-navy-subtle">{line.email || '—'}</td>
                      <td className="px-4 py-3">{STATUS_LABEL[line.status] || line.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AdminShell>
  );
}
