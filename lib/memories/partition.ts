/** Split published memories: member's batch first list, everyone else second (no duplicates). */
export function partitionPublishedMemories<T extends { id: string; batch_year: number | null }>(
  rows: T[],
  memberBatch: number | null
): { ownBatch: T[]; allSfs: T[] } {
  if (memberBatch == null || !Number.isFinite(memberBatch)) {
    return { ownBatch: [], allSfs: rows.slice() };
  }
  const ownBatch: T[] = [];
  const allSfs: T[] = [];
  for (const row of rows) {
    if (row.batch_year === memberBatch) ownBatch.push(row);
    else allSfs.push(row);
  }
  return { ownBatch, allSfs };
}
