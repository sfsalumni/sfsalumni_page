const MAX_URL = 500;
const MAX_LABEL = 80;
const DEFAULT_LABEL = 'Instagram';

export type SiteLinksFields = {
  instagram_url: string | null;
  instagram_label: string;
  published: boolean;
};

export type PublicInstagramLink = {
  href: string;
  label: string;
};

function trimOrEmpty(value: unknown): string {
  return String(value ?? '').trim();
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Throws Error with admin-facing message when invalid. */
export function assertSiteLinksFields(input: {
  instagram_url?: unknown;
  instagram_label?: unknown;
  published?: unknown;
}): SiteLinksFields {
  const rawUrl = trimOrEmpty(input.instagram_url);
  let instagram_url: string | null = null;
  if (rawUrl) {
    if (rawUrl.length > MAX_URL) {
      throw new Error(`Instagram URL must be ${MAX_URL} characters or fewer`);
    }
    if (!isHttpUrl(rawUrl)) {
      throw new Error('Instagram URL must be a valid http(s) link');
    }
    instagram_url = rawUrl;
  }

  const instagram_label = trimOrEmpty(input.instagram_label) || DEFAULT_LABEL;
  if (instagram_label.length > MAX_LABEL) {
    throw new Error(`Instagram label must be ${MAX_LABEL} characters or fewer`);
  }

  const publishedRaw = input.published;
  const published =
    publishedRaw === true ||
    publishedRaw === 'true' ||
    publishedRaw === '1' ||
    publishedRaw === 1;

  return { instagram_url, instagram_label, published };
}

/** Public hero link, or null when hidden / empty. */
export function publicInstagramLink(
  fields: Pick<SiteLinksFields, 'instagram_url' | 'instagram_label' | 'published'>
): PublicInstagramLink | null {
  if (!fields.published) return null;
  const href = (fields.instagram_url || '').trim();
  if (!href) return null;
  return {
    href,
    label: (fields.instagram_label || '').trim() || DEFAULT_LABEL,
  };
}
