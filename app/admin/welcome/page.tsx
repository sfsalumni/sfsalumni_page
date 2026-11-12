'use client';

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from 'react';
import AdminShell from '@/components/admin-shell';

type WelcomeMessage = {
  leadership_label: string;
  person_name: string;
  person_title: string;
  theme: string | null;
  headline: string;
  body: string;
  quote: string | null;
  signature_name: string;
  signature_role: string;
  cta_label: string;
  cta_href: string;
  photo_url: string | null;
  published: boolean;
};

const emptyForm = {
  leadership_label: 'School Leadership',
  person_name: '',
  person_title: '',
  theme: '',
  headline: '',
  body: '',
  quote: '',
  signature_name: '',
  signature_role: '',
  cta_label: 'Reconnect with SFS',
  cta_href: '#gallery-section',
  published: false,
};

export default function AdminWelcomePage() {
  const [form, setForm] = useState(emptyForm);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/welcome', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not load');
        setLoaded(true);
        return;
      }
      const m = payload.message as WelcomeMessage | null;
      if (m) {
        setForm({
          leadership_label: m.leadership_label || 'School Leadership',
          person_name: m.person_name || '',
          person_title: m.person_title || '',
          theme: m.theme || '',
          headline: m.headline || '',
          body: m.body || '',
          quote: m.quote || '',
          signature_name: m.signature_name || '',
          signature_role: m.signature_role || '',
          cta_label: m.cta_label || 'Reconnect with SFS',
          cta_href: m.cta_href || '#gallery-section',
          published: Boolean(m.published),
        });
        setPhotoUrl(m.photo_url);
      }
      setPhoto(null);
      setClearPhoto(false);
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
      let res: Response;
      if (photo || clearPhoto) {
        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          if (key === 'published') {
            body.set('published', value ? 'true' : 'false');
          } else {
            body.set(key, String(value ?? ''));
          }
        });
        if (photo) body.set('photo', photo);
        if (clearPhoto) body.set('clear_photo', 'true');
        res = await fetch('/api/admin/welcome', { method: 'POST', body });
      } else {
        res = await fetch('/api/admin/welcome', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...form, clear_photo: false }),
        });
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Save failed');
        return;
      }
      const m = payload.message as WelcomeMessage;
      setPhotoUrl(m.photo_url);
      setPhoto(null);
      setClearPhoto(false);
      setOk(
        form.published
          ? 'Saved and published — visible on the homepage.'
          : 'Saved as draft — homepage section stays hidden until Published.'
      );
      await load();
    } catch {
      setError('Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Welcome message">
      <p className="text-body-sm text-on-surface-variant mb-6 max-w-3xl">
        Edit the principal&apos;s jubilee welcome on the homepage. Leave the photo empty for a
        full-width text layout. Keep <strong>Published</strong> off to hide the whole section.
      </p>

      {!loaded ? (
        <p className="text-body-sm text-on-surface-variant">Loading…</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-outline-variant bg-white p-5 space-y-3 max-w-3xl"
        >
          <Field label="Leadership label" htmlFor="wm-label">
            <input
              id="wm-label"
              value={form.leadership_label}
              onChange={(e) => setForm((f) => ({ ...f, leadership_label: e.target.value }))}
              className={inputClass}
              disabled={busy}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="wm-name">
              <input
                id="wm-name"
                required
                value={form.person_name}
                onChange={(e) => setForm((f) => ({ ...f, person_name: e.target.value }))}
                className={inputClass}
                disabled={busy}
              />
            </Field>
            <Field label="Title" htmlFor="wm-title">
              <input
                id="wm-title"
                required
                value={form.person_title}
                onChange={(e) => setForm((f) => ({ ...f, person_title: e.target.value }))}
                className={inputClass}
                disabled={busy}
              />
            </Field>
          </div>
          <Field label="Theme (optional)" htmlFor="wm-theme">
            <input
              id="wm-theme"
              value={form.theme}
              onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
              className={inputClass}
              disabled={busy}
              placeholder="Aspire to Achieve"
            />
          </Field>
          <Field label="Headline" htmlFor="wm-headline">
            <input
              id="wm-headline"
              required
              value={form.headline}
              onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
              className={inputClass}
              disabled={busy}
            />
          </Field>
          <Field label="Body" htmlFor="wm-body">
            <textarea
              id="wm-body"
              required
              rows={8}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className={`${inputClass} resize-y min-h-[10rem]`}
              disabled={busy}
              placeholder="Separate paragraphs with a blank line"
            />
            <p className="text-body-sm text-on-surface-variant mt-1">
              Separate paragraphs with a blank line. {form.body.length}/8000
            </p>
          </Field>
          <Field label="Quote (optional)" htmlFor="wm-quote">
            <textarea
              id="wm-quote"
              rows={2}
              value={form.quote}
              onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
              className={`${inputClass} resize-y`}
              disabled={busy}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Signature name" htmlFor="wm-sig-name">
              <input
                id="wm-sig-name"
                value={form.signature_name}
                onChange={(e) => setForm((f) => ({ ...f, signature_name: e.target.value }))}
                className={inputClass}
                disabled={busy}
              />
            </Field>
            <Field label="Signature role" htmlFor="wm-sig-role">
              <input
                id="wm-sig-role"
                value={form.signature_role}
                onChange={(e) => setForm((f) => ({ ...f, signature_role: e.target.value }))}
                className={inputClass}
                disabled={busy}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CTA label" htmlFor="wm-cta-label">
              <input
                id="wm-cta-label"
                value={form.cta_label}
                onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
                className={inputClass}
                disabled={busy}
              />
            </Field>
            <Field label="CTA link" htmlFor="wm-cta-href">
              <input
                id="wm-cta-href"
                value={form.cta_href}
                onChange={(e) => setForm((f) => ({ ...f, cta_href: e.target.value }))}
                className={inputClass}
                disabled={busy}
                placeholder="#gallery-section"
              />
            </Field>
          </div>

          <div>
            <span className="text-label-sm uppercase tracking-wider text-primary block mb-1">
              Photo (optional)
            </span>
            {photoUrl && !clearPhoto && !photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="w-28 h-36 rounded-lg object-cover mb-2 border border-outline-variant"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <input
              id="wm-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                setPhoto(e.target.files?.[0] || null);
                setClearPhoto(false);
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="wm-photo"
                className={`inline-flex items-center justify-center rounded-lg border border-outline-variant bg-white px-4 py-2.5 text-label-sm font-bold uppercase tracking-wider text-primary cursor-pointer hover:bg-surface-container ${
                  busy ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {photo || photoUrl ? 'Replace photo' : 'Upload photo'}
              </label>
              <span className="text-body-sm text-on-surface-variant truncate max-w-[14rem]">
                {photo ? photo.name : 'JPEG, PNG, or WebP · max 4 MB'}
              </span>
            </div>
          </div>
          {photoUrl ? (
            <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={clearPhoto}
                onChange={(e) => setClearPhoto(e.target.checked)}
                disabled={busy || Boolean(photo)}
              />
              Remove current photo (full-width text layout)
            </label>
          ) : null}

          <label className="flex items-center gap-2 text-body-sm text-primary font-medium">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              disabled={busy}
            />
            Published on homepage
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
            {busy ? 'Saving…' : 'Save welcome message'}
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
