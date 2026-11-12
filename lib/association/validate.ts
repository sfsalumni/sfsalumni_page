const MAX_EYEBROW = 120;
const MAX_TITLE = 160;
const MAX_HEADING = 120;
const MAX_BODY = 8000;
const MAX_NOTE = 1000;
const MAX_CTA_LABEL = 80;
const MAX_CTA_HREF = 300;

const DEFAULT_CTA_LABEL = 'Visit member portal ↗';
const DEFAULT_CTA_HREF = '/member';

export type AssociationAboutFields = {
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

function trimOrEmpty(value: unknown): string {
  return String(value ?? '').trim();
}

function optionalText(value: unknown, max: number, label: string): string | null {
  const text = trimOrEmpty(value);
  if (!text) return null;
  if (text.length > max) throw new Error(`${label} must be ${max} characters or fewer`);
  return text;
}

function requireText(value: unknown, max: number, label: string): string {
  const text = trimOrEmpty(value);
  if (!text) throw new Error(`${label} is required`);
  if (text.length > max) throw new Error(`${label} must be ${max} characters or fewer`);
  return text;
}

/** Throws Error with admin-facing message when invalid. */
export function assertAssociationAboutFields(input: {
  eyebrow?: unknown;
  title?: unknown;
  purpose_heading?: unknown;
  purpose_body?: unknown;
  purpose_note?: unknown;
  cta_label?: unknown;
  cta_href?: unknown;
  highlight_eyebrow?: unknown;
  highlight_title?: unknown;
  highlight_body?: unknown;
  published?: unknown;
}): AssociationAboutFields {
  const eyebrow = requireText(input.eyebrow, MAX_EYEBROW, 'Eyebrow');
  const title = requireText(input.title, MAX_TITLE, 'Title');
  const purpose_heading = requireText(input.purpose_heading, MAX_HEADING, 'Purpose heading');
  const purpose_body = requireText(input.purpose_body, MAX_BODY, 'Purpose body');
  const purpose_note = optionalText(input.purpose_note, MAX_NOTE, 'Purpose note');

  const cta_label = trimOrEmpty(input.cta_label) || DEFAULT_CTA_LABEL;
  if (cta_label.length > MAX_CTA_LABEL) {
    throw new Error(`CTA label must be ${MAX_CTA_LABEL} characters or fewer`);
  }

  const cta_href = trimOrEmpty(input.cta_href) || DEFAULT_CTA_HREF;
  if (cta_href.length > MAX_CTA_HREF) {
    throw new Error(`CTA link must be ${MAX_CTA_HREF} characters or fewer`);
  }
  if (!/^[#/?]|^https?:\/\//i.test(cta_href) && !cta_href.startsWith('/')) {
    throw new Error('CTA link must be a path, hash, or http(s) URL');
  }

  const highlight_eyebrow = requireText(input.highlight_eyebrow, MAX_EYEBROW, 'Highlight eyebrow');
  const highlight_title = requireText(input.highlight_title, MAX_TITLE, 'Highlight title');
  const highlight_body = requireText(input.highlight_body, MAX_BODY, 'Highlight body');

  const publishedRaw = input.published;
  const published =
    publishedRaw === true ||
    publishedRaw === 'true' ||
    publishedRaw === '1' ||
    publishedRaw === 1;

  return {
    eyebrow,
    title,
    purpose_heading,
    purpose_body,
    purpose_note,
    cta_label,
    cta_href,
    highlight_eyebrow,
    highlight_title,
    highlight_body,
    published,
  };
}
