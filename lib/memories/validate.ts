/** Below typical serverless body limits (~4.5 MB) so validation can run before host 413. */
const MAX_BYTES = 4_000_000;
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 500;
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export { MAX_BYTES as MEMORY_MAX_BYTES };

export type MemoryUploadFile = { name?: string; type: string; size: number };

export type MemoryUploadOk = {
  title: string;
  description: string | null;
  batchYear: number | null;
  ext: string;
};

function parseBatchYear(raw: unknown, fallback?: number | null): number | null {
  if (raw === undefined || raw === null) {
    return fallback != null && Number.isFinite(fallback) ? fallback : null;
  }
  const s = String(raw).trim().toLowerCase();
  if (!s || s === 'general' || s === 'all' || s === 'none') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1900 || n > 2100) {
    throw new Error('Batch year must be a valid year or General');
  }
  return Math.trunc(n);
}

/** Throws Error with a member-facing message when invalid. */
export function assertMemoryUpload(input: {
  title: unknown;
  description?: unknown;
  consent: unknown;
  batchYearRaw: unknown;
  file: MemoryUploadFile | null | undefined;
  defaultBatchYear?: number | null;
}): MemoryUploadOk {
  const title = String(input.title ?? '').trim();
  if (!title) throw new Error('Title is required');
  if (title.length > MAX_TITLE) throw new Error(`Title must be ${MAX_TITLE} characters or fewer`);

  if (input.consent !== true && input.consent !== 'true') {
    throw new Error('Consent is required to share a memory');
  }

  const file = input.file;
  if (!file) throw new Error('Image is required');
  if (file.size > MAX_BYTES) throw new Error('Image must be 4 MB or smaller');
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error('Image type must be JPEG, PNG, or WebP');

  const descriptionRaw = input.description != null ? String(input.description).trim() : '';
  if (descriptionRaw.length > MAX_DESCRIPTION) {
    throw new Error(`Caption must be ${MAX_DESCRIPTION} characters or fewer`);
  }
  return {
    title,
    description: descriptionRaw || null,
    batchYear: parseBatchYear(input.batchYearRaw, input.defaultBatchYear),
    ext,
  };
}
