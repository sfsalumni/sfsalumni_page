/** A published event is open before it starts, and after it starts until ends_at. */
export function eventIsOpen(
  event: { published?: boolean; starts_at: string; ends_at?: string | null },
  now: Date
): boolean {
  if (event.published === false) return false;
  const t = now.getTime();
  const start = new Date(event.starts_at).getTime();
  if (Number.isFinite(start) && start >= t) return true;
  if (!event.ends_at) return false;
  const end = new Date(event.ends_at).getTime();
  return Number.isFinite(end) && end >= t;
}
