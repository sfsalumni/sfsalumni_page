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
import AssociationRichText from '@/components/association-rich-text';
import { ASSOCIATION_ABOUT_FALLBACK } from '@/lib/association/fallback';
import { wrapWelcomeMarkup, type WrapKind } from '@/lib/welcome/markup';

type AssociationAbout = {
  eyebrow: string;
  title: string;
  purpose_heading: string;
  purpose_body: string;
  purpose_note: string | null;
  cta_label: string;
  cta_href: string;
  highlight_eyebrow: string;
  highlight_title: string;
  highlight_body: string;
  published: boolean;
};

type BodyField = 'purpose_body' | 'purpose_note' | 'highlight_body';

const emptyForm = {
  eyebrow: ASSOCIATION_ABOUT_FALLBACK.eyebrow,
  title: ASSOCIATION_ABOUT_FALLBACK.title,
  purpose_heading: ASSOCIATION_ABOUT_FALLBACK.purpose_heading,
  purpose_body: ASSOCIATION_ABOUT_FALLBACK.purpose_body,
  purpose_note: ASSOCIATION_ABOUT_FALLBACK.purpose_note || '',
  cta_label: ASSOCIATION_ABOUT_FALLBACK.cta_label,
  cta_href: ASSOCIATION_ABOUT_FALLBACK.cta_href,
  highlight_eyebrow: ASSOCIATION_ABOUT_FALLBACK.highlight_eyebrow,
  highlight_title: ASSOCIATION_ABOUT_FALLBACK.highlight_title,
  highlight_body: ASSOCIATION_ABOUT_FALLBACK.highlight_body,
  published: false,
};

export default function AdminAssociationPage() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const purposeBodyRef = useRef<HTMLTextAreaElement>(null);
  const purposeNoteRef = useRef<HTMLTextAreaElement>(null);
  const highlightBodyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/association', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || 'Could not load');
        setLoaded(true);
        return;
      }
      const m = payload.message as AssociationAbout | null;
      if (m) {
        setForm({
          eyebrow: m.eyebrow || '',
          title: m.title || '',
          purpose_heading: m.purpose_heading || '',
          purpose_body: m.purpose_body || '',
          purpose_note: m.purpose_note || '',
          cta_label: m.cta_label || '',
          cta_href: m.cta_href || '',
          highlight_eyebrow: m.highlight_eyebrow || '',
          highlight_title: m.highlight_title || '',
          highlight_body: m.highlight_body || '',
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

  function applyWrap(ref: RefObject<HTMLTextAreaElement | null>, field: BodyField, kind: WrapKind) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const next = wrapWelcomeMarkup(el.value, start, end, kind);
    setForm((f) => ({ ...f, [field]: next }));
    requestAnimationFrame(() => {
      const openLen = kind === 'italic' ? 1 : 2;
      el.focus();
      el.setSelectionRange(start + openLen, end + openLen);
    });
  }

  function insertBullet(ref: RefObject<HTMLTextAreaElement | null>, field: BodyField) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const value = el.value;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const prefix = value.slice(lineStart, start).trim() ? '\n- ' : '- ';
    const next = `${value.slice(0, start)}${prefix}${value.slice(start)}`;
    setForm((f) => ({ ...f, [field]: next }));
    requestAnimationFrame(() => {
      const pos = start + prefix.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetch('/api/admin/association', {
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
        form.published
          ? 'Saved and published — live on /about-association.'
          : 'Saved as draft — public page keeps the fallback copy until Published.'
      );
      await load();
    } catch {
      setError('Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="About association">
      <p className="text-body-sm text-on-surface-variant mb-6 max-w-3xl">
        Edit the mission and legacy copy on{' '}
        <a href="/about-association" className="text-primary font-bold underline underline-offset-2">
          /about-association
        </a>
        . Unpublish to fall back to the built-in proposed copy.
      </p>

      {!loaded ? (
        <p className="text-body-sm text-on-surface-variant">Loading…</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-outline-variant bg-white p-5 space-y-3 max-w-3xl"
        >
          <Field label="Page eyebrow" htmlFor="aa-eyebrow">
            <input
              id="aa-eyebrow"
              required
              value={form.eyebrow}
              onChange={(e) => setForm((f) => ({ ...f, eyebrow: e.target.value }))}
              className={inputClass}
              disabled={busy}
            />
          </Field>
          <Field label="Page title" htmlFor="aa-title">
            <input
              id="aa-title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputClass}
              disabled={busy}
            />
          </Field>

          <Field label="Purpose heading" htmlFor="aa-purpose-heading">
            <input
              id="aa-purpose-heading"
              required
              value={form.purpose_heading}
              onChange={(e) => setForm((f) => ({ ...f, purpose_heading: e.target.value }))}
              className={inputClass}
              disabled={busy}
            />
          </Field>
          <Field label="Purpose body" htmlFor="aa-purpose-body">
            <MarkupToolbar
              disabled={busy}
              onWrap={(kind) => applyWrap(purposeBodyRef, 'purpose_body', kind)}
              onBullet={() => insertBullet(purposeBodyRef, 'purpose_body')}
            />
            <textarea
              id="aa-purpose-body"
              ref={purposeBodyRef}
              required
              rows={8}
              value={form.purpose_body}
              onChange={(e) => setForm((f) => ({ ...f, purpose_body: e.target.value }))}
              className={`${inputClass} resize-y min-h-[10rem]`}
              disabled={busy}
              placeholder={
                'Separate paragraphs with a blank line.\n- Bullet one\n- Bullet two\nSelect text, then Bold / Italic / Highlight.'
              }
            />
            <p className="text-body-sm text-on-surface-variant mt-1">
              Blank line = new paragraph. Start a line with <code>- </code> for a bullet.{' '}
              {form.purpose_body.length}/8000
            </p>
          </Field>
          <Field label="Purpose note (optional)" htmlFor="aa-purpose-note">
            <MarkupToolbar
              disabled={busy}
              onWrap={(kind) => applyWrap(purposeNoteRef, 'purpose_note', kind)}
              onBullet={() => insertBullet(purposeNoteRef, 'purpose_note')}
            />
            <textarea
              id="aa-purpose-note"
              ref={purposeNoteRef}
              rows={3}
              value={form.purpose_note}
              onChange={(e) => setForm((f) => ({ ...f, purpose_note: e.target.value }))}
              className={`${inputClass} resize-y`}
              disabled={busy}
              placeholder="Leave blank once the committee approves the mission statement"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CTA label" htmlFor="aa-cta-label">
              <input
                id="aa-cta-label"
                value={form.cta_label}
                onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
                className={inputClass}
                disabled={busy}
              />
            </Field>
            <Field label="CTA link" htmlFor="aa-cta-href">
              <input
                id="aa-cta-href"
                value={form.cta_href}
                onChange={(e) => setForm((f) => ({ ...f, cta_href: e.target.value }))}
                className={inputClass}
                disabled={busy}
                placeholder="/member"
              />
            </Field>
          </div>

          <Field label="Highlight eyebrow" htmlFor="aa-hl-eyebrow">
            <input
              id="aa-hl-eyebrow"
              required
              value={form.highlight_eyebrow}
              onChange={(e) => setForm((f) => ({ ...f, highlight_eyebrow: e.target.value }))}
              className={inputClass}
              disabled={busy}
            />
          </Field>
          <Field label="Highlight title" htmlFor="aa-hl-title">
            <input
              id="aa-hl-title"
              required
              value={form.highlight_title}
              onChange={(e) => setForm((f) => ({ ...f, highlight_title: e.target.value }))}
              className={inputClass}
              disabled={busy}
            />
          </Field>
          <Field label="Highlight body" htmlFor="aa-hl-body">
            <MarkupToolbar
              disabled={busy}
              onWrap={(kind) => applyWrap(highlightBodyRef, 'highlight_body', kind)}
              onBullet={() => insertBullet(highlightBodyRef, 'highlight_body')}
            />
            <textarea
              id="aa-hl-body"
              ref={highlightBodyRef}
              required
              rows={4}
              value={form.highlight_body}
              onChange={(e) => setForm((f) => ({ ...f, highlight_body: e.target.value }))}
              className={`${inputClass} resize-y`}
              disabled={busy}
            />
          </Field>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-3">
              Live preview (purpose body)
            </p>
            <AssociationRichText text={form.purpose_body} />
          </div>

          <label className="flex items-center gap-2 text-body-sm text-primary font-medium">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              disabled={busy}
            />
            Published on /about-association
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
            {busy ? 'Saving…' : 'Save association about'}
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

function MarkupToolbar({
  disabled,
  onWrap,
  onBullet,
}: {
  disabled: boolean;
  onWrap: (kind: WrapKind) => void;
  onBullet: () => void;
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
      <button type="button" className={btn} disabled={disabled} onClick={onBullet}>
        Bullet
      </button>
    </div>
  );
}
