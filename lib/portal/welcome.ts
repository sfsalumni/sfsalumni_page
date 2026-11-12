/** First token of a full name; empty → "friend". */
export function firstNameFromFullName(fullName: string): string {
  const first = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];
  return first || 'friend';
}
