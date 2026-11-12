/** Storage object key under bucket `alumni-memories`. */
export function memoryObjectPath(
  batchYear: number | null,
  objectId: string,
  ext: string
): string {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  if (batchYear != null && Number.isFinite(batchYear)) {
    return `batch/${batchYear}/${objectId}.${cleanExt}`;
  }
  return `general/${objectId}.${cleanExt}`;
}
