export type HeroEventFields = {
  title: string;
  summary: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  venue?: string | null;
};

export type HeroCopy = {
  eyebrow: string;
  title: string;
  body: string;
  meta: string;
};

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/** Hero lines follow the create-event form: title, summary, then description. */
export function heroEventCopy(event: HeroEventFields): HeroCopy {
  const start = dayLabel(event.starts_at);
  const end = event.ends_at ? dayLabel(event.ends_at) : '';
  const when = end && end !== start ? `${start} – ${end}` : start;
  const venue = (event.venue || '').trim();
  const summary = event.summary.trim();
  const description = (event.description || '').trim();
  return {
    eyebrow: event.title.trim(),
    title: summary || event.title.trim(),
    body: description && description !== summary ? description : '',
    meta: [when, venue].filter(Boolean).join(' • '),
  };
}
