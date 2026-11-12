export type DirectoryAlum = {
  id: string;
  full_name: string;
  batch: number | null;
  username: string | null;
  current_location: string | null;
  profession: string | null;
};

const MAX = 100;

export function filterDirectoryRows(
  rows: DirectoryAlum[],
  opts: { q: string; batch: number | null }
): DirectoryAlum[] {
  const q = opts.q.trim().toLowerCase();
  const out: DirectoryAlum[] = [];
  for (const row of rows) {
    if (opts.batch != null && Number.isFinite(opts.batch) && row.batch !== opts.batch) continue;
    if (q) {
      const hay = [
        row.full_name,
        row.username || '',
        row.batch != null ? String(row.batch) : '',
        row.current_location || '',
        row.profession || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }
    out.push(row);
    if (out.length >= MAX) break;
  }
  return out;
}
