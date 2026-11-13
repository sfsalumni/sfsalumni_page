'use client';

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from 'react';
import AdminShell from '@/components/admin-shell';

const emptyForm = {
  instagram_url: '',
  instagram_label: 'Instagram',
  published: false,
};

export default function AdminSiteLinksPage() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/site-links', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not load');
        setLoaded(true);
        return;
      }
      const m = payload.message as {
        instagram_url: string | null;
        instagram_label: string;
        published: boolean;
      } | null;
      if (m) {
        setForm({
          instagram_url: m.instagram_url || '',
          instagram_label: m.instagram_label || 'Instagram',
          published: Boolean(m.published),
        });
      }
      setLoaded(true);
    } catch {
      setError('Could not load');
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetch('/api/admin/site-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Save failed');
        return;
      }
      setOk(
        form.published && form.instagram_url.trim()
          ? 'Saved — Instagram button is visible next to Register on the landing hero.'
          : 'Saved — Instagram button stays hidden until Published with a URL.'
      );
      await load();
    } catch {
      setError('Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Site links">
      <p className="text-body-sm text-on-surface-variant mb-6 max-w-3xl">
        Control the Instagram button shown next to Register on the homepage hero. Leave the URL blank
        or unpublish to hide it.
      </p>

      {!loaded ? (
        <p className="text-body-sm text-on-surface-variant">Loading…</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-outline-variant bg-white p-5 space-y-3 max-w-3xl"
        >
          <Field label="Instagram URL" htmlFor="sl-url">
            <input
              id="sl-url"
              type="url"
              value={form.instagram_url}
              onChange={(e) => setForm((f) => ({ ...f, instagram_url: e.target.value }))}
              className={inputClass}
              disabled={busy}
              placeholder="https://www.instagram.com/your.handle/"
            />
          </Field>
          <Field label="Button label" htmlFor="sl-label">
            <input
              id="sl-label"
              value={form.instagram_label}
              onChange={(e) => setForm((f) => ({ ...f, instagram_label: e.target.value }))}
              className={inputClass}
              disabled={busy}
              placeholder="Instagram"
            />
          </Field>

          <label className="flex items-center gap-2 text-body-sm text-primary font-medium">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              disabled={busy}
            />
            Published on landing hero
          </label>

          {error ? (
            <p className="rounded-lg bg-error-container text-error text-body-sm p-3">{error}</p>
          ) : null}
          {ok ? (
            <p className="rounded-lg bg-secondary-container text-on-secondary-fixed text-body-sm p-3">
              {ok}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary text-on-primary px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save site links'}
          </button>
        </form>
      )}
    </AdminShell>
  );
}

const inputClass =
  'w-full px-4 py-3.5 rounded-lg border border-outline-variant text-body-sm bg-surface focus:outline-none focus:border-primary';

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-label-sm uppercase tracking-wider text-primary block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
