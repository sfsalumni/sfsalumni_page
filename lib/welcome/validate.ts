const MAX_LABEL = 80;
const MAX_NAME = 120;
const MAX_TITLE = 120;
const MAX_THEME = 120;
const MAX_HEADLINE = 160;
const MAX_BODY = 8000;
const MAX_QUOTE = 500;
const MAX_SIGNATURE = 120;
const MAX_CTA_LABEL = 80;
const MAX_CTA_HREF = 300;
const MAX_BYTES = 4_000_000;

const DEFAULT_CTA_LABEL = 'Reconnect with SFS';
const DEFAULT_CTA_HREF = '#gallery-section';
const DEFAULT_LEADERSHIP = 'School Leadership';

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export { MAX_BYTES as WELCOME_MAX_BYTES };

export type WelcomeFields = {
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

/** Throws Error with admin-facing message when invalid. */
export function assertWelcomeFields(input: {
  leadership_label?: unknown;
  person_name?: unknown;
  person_title?: unknown;
  theme?: unknown;
  headline?: unknown;
  body?: unknown;
  quote?: unknown;
  signature_name?: unknown;
  signature_role?: unknown;
  cta_label?: unknown;
  cta_href?: unknown;
  published?: unknown;
}): WelcomeFields {
  const leadership_label =
    optionalText(input.leadership_label, MAX_LABEL, 'Leadership label') || DEFAULT_LEADERSHIP;

  const person_name = trimOrEmpty(input.person_name);
  if (!person_name) throw new Error('Name is required');
  if (person_name.length > MAX_NAME) throw new Error(`Name must be ${MAX_NAME} characters or fewer`);

  const person_title = trimOrEmpty(input.person_title);
  if (!person_title) throw new Error('Title is required');
  if (person_title.length > MAX_TITLE) {
    throw new Error(`Title must be ${MAX_TITLE} characters or fewer`);
  }

  const theme = optionalText(input.theme, MAX_THEME, 'Theme');

  const headline = trimOrEmpty(input.headline);
  if (!headline) throw new Error('Headline is required');
  if (headline.length > MAX_HEADLINE) {
    throw new Error(`Headline must be ${MAX_HEADLINE} characters or fewer`);
  }

  const body = trimOrEmpty(input.body);
  if (!body) throw new Error('Body is required');
  if (body.length > MAX_BODY) throw new Error(`Body must be ${MAX_BODY} characters or fewer`);

  const quote = optionalText(input.quote, MAX_QUOTE, 'Quote');

  const signature_name = trimOrEmpty(input.signature_name) || person_name;
  if (signature_name.length > MAX_SIGNATURE) {
    throw new Error(`Signature name must be ${MAX_SIGNATURE} characters or fewer`);
  }

  const signature_role = trimOrEmpty(input.signature_role) || person_title;
  if (signature_role.length > MAX_SIGNATURE) {
    throw new Error(`Signature role must be ${MAX_SIGNATURE} characters or fewer`);
  }

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

  const publishedRaw = input.published;
  const published =
    publishedRaw === true ||
    publishedRaw === 'true' ||
    publishedRaw === '1' ||
    publishedRaw === 1;

  return {
    leadership_label,
    person_name,
    person_title,
    theme,
    headline,
    body,
    quote,
    signature_name,
    signature_role,
    cta_label,
    cta_href,
    published,
  };
}

export function splitWelcomeBody(body: string): string[] {
  return String(body || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function assertWelcomeImage(
  file: { type: string; size: number } | null | undefined,
  required: boolean
): string | null {
  if (!file) {
    if (required) throw new Error('Photo is required');
    return null;
  }
  if (file.size > MAX_BYTES) throw new Error('Image must be 4 MB or smaller');
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error('Image type must be JPEG, PNG, or WebP');
  return ext;
}

export function welcomeObjectPath(ext: string): string {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  return `welcome/portrait.${cleanExt}`;
}
