'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import AdminShell from '@/components/admin-shell';
import WelcomeRichText from '@/components/welcome-rich-text';
import { wrapWelcomeMarkup, type WrapKind } from '@/lib/welcome/markup';
import {
  DEFAULT_WELCOME_STYLE,
  assertWelcomeStyle,
  resolveWelcomeStyle,
  welcomeBodyClass,
  welcomeFontClass,
  welcomeHeadlineClass,
  type WelcomeStyle,
} from '@/lib/welcome/style';
import { splitWelcomeBody } from '@/lib/welcome/validate';

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
  style?: unknown;
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
  style: { ...DEFAULT_WELCOME_STYLE } as WelcomeStyle,
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const quoteRef = useRef<HTMLTextAreaElement>(null);

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
        let style = DEFAULT_WELCOME_STYLE;
        try {
          style = assertWelcomeStyle(m.style);
        } catch {
          style = DEFAULT_WELCOME_STYLE;
        }
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
          style,
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

  function patchStyle(patch: Partial<WelcomeStyle>) {
    setForm((f) => ({ ...f, style: { ...f.style, ...patch } }));
  }

  function applyWrap(ref: RefObject<HTMLTextAreaElement | null>, field: 'body' | 'quote', kind: WrapKind) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const next = wrapWelcomeMarkup(el.value, start, end, kind);
    setForm((f) => ({ ...f, [field]: next }));
    requestAnimationFrame(() => {
      const openLen = kind === 'mark' ? 2 : kind === 'bold' ? 2 : 1;
      el.focus();
      el.setSelectionRange(start + openLen, end + openLen);
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      let style: WelcomeStyle;
      try {
        style = assertWelcomeStyle(form.style);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid style');
        return;
      }

      const payloadFields = { ...form, style };
      let res: Response;
      if (photo || clearPhoto) {
        const body = new FormData();
        Object.entries(payloadFields).forEach(([key, value]) => {
          if (key === 'published') {
            body.set('published', value ? 'true' : 'false');
          } else if (key === 'style') {
            body.set('style', JSON.stringify(value));
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
          body: JSON.stringify({ ...payloadFields, clear_photo: false }),
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
      if (payload.warning) setOk((prev) => `${prev} ${payload.warning}`);
      await load();
    } catch {
      setError('Save failed');
    } finally {
      setBusy(false);
    }
  }

  const resolved = resolveWelcomeStyle(form.style);
  const previewParas = splitWelcomeBody(form.body);

  return (
    <AdminShell title="Welcome message">
      <p className="text-body-sm text-on-surface-variant mb-6 max-w-3xl">
        Edit the principal&apos;s welcome on the homepage. Set typography and highlights below.
        Keep <strong>Published</strong> off to hide the whole section.
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

          <fieldset className="rounded-xl border border-outline-variant p-4 space-y-3">
            <legend className="text-label-sm uppercase tracking-wider text-primary px-1">
              Typography &amp; color
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Color theme" htmlFor="wm-style-theme">
                <select
                  id="wm-style-theme"
                  value={form.style.theme}
                  onChange={(e) =>
                    patchStyle({ theme: e.target.value as WelcomeStyle['theme'] })
                  }
                  className={inputClass}
                  disabled={busy}
                >
                  <option value="default">Default</option>
                  <option value="charcoal">Charcoal</option>
                  <option value="bronze">Bronze / gold</option>
                  <option value="teal">Academic teal</option>
                </select>
              </Field>
              <Field label="Font" htmlFor="wm-style-font">
                <select
                  id="wm-style-font"
                  value={form.style.font}
                  onChange={(e) => patchStyle({ font: e.target.value as WelcomeStyle['font'] })}
                  className={inputClass}
                  disabled={busy}
                >
                  <option value="sans">Sans (Manrope)</option>
                  <option value="serif">Serif (EB Garamond)</option>
                </select>
              </Field>
              <Field label="Size" htmlFor="wm-style-size">
                <select
                  id="wm-style-size"
                  value={form.style.size}
                  onChange={(e) => patchStyle({ size: e.target.value as WelcomeStyle['size'] })}
                  className={inputClass}
                  disabled={busy}
                >
                  <option value="s">Small</option>
                  <option value="m">Medium</option>
                  <option value="l">Large</option>
                </select>
              </Field>
            </div>
            <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">
              Advanced color overrides
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <ColorField
                id="wm-headline-color"
                label="Headline"
                value={form.style.headlineColor}
                fallback={resolved.headlineColor}
                disabled={busy}
                onChange={(v) => patchStyle({ headlineColor: v })}
              />
              <ColorField
                id="wm-body-color"
                label="Body"
                value={form.style.bodyColor}
                fallback={resolved.bodyColor}
                disabled={busy}
                onChange={(v) => patchStyle({ bodyColor: v })}
              />
              <ColorField
                id="wm-accent-color"
                label="Accent / highlight"
                value={form.style.accentColor}
                fallback={resolved.accentColor}
                disabled={busy}
                onChange={(v) => patchStyle({ accentColor: v })}
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                patchStyle({ headlineColor: null, bodyColor: null, accentColor: null })
              }
              className="text-label-sm text-primary underline underline-offset-2 disabled:opacity-50"
            >
              Reset colors to theme preset
            </button>
          </fieldset>

          <Field label="Body" htmlFor="wm-body">
            <MarkupToolbar
              disabled={busy}
              onWrap={(kind) => applyWrap(bodyRef, 'body', kind)}
            />
            <textarea
              id="wm-body"
              ref={bodyRef}
              required
              rows={8}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className={`${inputClass} resize-y min-h-[10rem]`}
              disabled={busy}
              placeholder="Separate paragraphs with a blank line. Select text, then Bold / Italic / Highlight."
            />
            <p className="text-body-sm text-on-surface-variant mt-1">
              Separate paragraphs with a blank line. Select text to apply highlights.{' '}
              {form.body.length}/8000
            </p>
          </Field>
          <Field label="Quote (optional)" htmlFor="wm-quote">
            <MarkupToolbar
              disabled={busy}
              onWrap={(kind) => applyWrap(quoteRef, 'quote', kind)}
            />
            <textarea
              id="wm-quote"
              ref={quoteRef}
              rows={2}
              value={form.quote}
              onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
              className={`${inputClass} resize-y`}
              disabled={busy}
            />
          </Field>

          <div
            className={`rounded-xl border border-outline-variant bg-surface-container-low p-4 ${welcomeFontClass(resolved.fontFamily)}`}
          >
            <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-3">
              Live preview
            </p>
            <h3
              className={`${welcomeHeadlineClass(resolved.size)} mb-2 leading-tight`}
              style={{ color: resolved.headlineColor }}
            >
              {form.headline || 'Headline'}
            </h3>
            {previewParas.length ? (
              previewParas.map((p, i) => (
                <p
                  key={i}
                  className={`${welcomeBodyClass(resolved.size)} mb-2 leading-relaxed`}
                  style={{ color: resolved.bodyColor }}
                >
                  <WelcomeRichText text={p} markColor={resolved.accentColor} />
                </p>
              ))
            ) : (
              <p className="text-body-sm text-on-surface-variant">Body preview appears here.</p>
            )}
            {form.quote ? (
              <blockquote
                className="mt-3 p-3 rounded-lg bg-white italic"
                style={{ color: resolved.headlineColor }}
              >
                &ldquo;
                <WelcomeRichText text={form.quote} markColor={resolved.accentColor} />
                &rdquo;
              </blockquote>
            ) : null}
          </div>

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

function ColorField({
  id,
  label,
  value,
  fallback,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  fallback: string;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  const shown = value || fallback;
  return (
    <div>
      <label htmlFor={id} className="text-label-sm uppercase tracking-wider text-primary block mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={shown}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-12 rounded border border-outline-variant bg-white p-1"
        />
        <input
          type="text"
          value={value || ''}
          placeholder={fallback}
          disabled={disabled}
          onChange={(e) => {
            const t = e.target.value.trim();
            onChange(t ? t : null);
          }}
          className={inputClass}
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

function MarkupToolbar({
  disabled,
  onWrap,
}: {
  disabled: boolean;
  onWrap: (kind: WrapKind) => void;
}) {
  const btn =
    'rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-label-sm font-bold text-primary disabled:opacity-50';
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      <button type="button" className={btn} disabled={disabled} onClick={() => onWrap('bold')}>
        Bold
      </button>
      <button type="button" className={btn} disabled={disabled} onClick={() => onWrap('italic')}>
        Italic
      </button>
      <button type="button" className={btn} disabled={disabled} onClick={() => onWrap('mark')}>
        Highlight
      </button>
    </div>
  );
}
