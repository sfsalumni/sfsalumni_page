import { heroEventCopy } from '../lib/events/hero-copy.ts';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

const ranged = heroEventCopy({
  title: '50 Celebrations',
  summary: 'Short summary',
  description: 'The longer story from the event form.',
  starts_at: '2026-10-26T07:26:00Z',
  ends_at: '2026-12-06T07:26:00Z',
  venue: 'SFS School, Shantinagar',
});
assert(ranged.eyebrow === '50 Celebrations', 'title is the small line');
assert(ranged.title === 'Short summary', 'summary is the heading');
assert(ranged.body === 'The longer story from the event form.', 'description is the paragraph');
assert(ranged.meta.includes('26 Oct 2026'), 'start day');
assert(ranged.meta.includes('6 Dec 2026'), 'end day');
assert(ranged.meta.includes('SFS School, Shantinagar'), 'venue');

const summaryOnly = heroEventCopy({
  title: 'Batch meetup',
  summary: 'Only the summary',
  description: '   ',
  starts_at: '2026-11-01T04:30:00Z',
  ends_at: null,
  venue: '',
});
assert(summaryOnly.title === 'Only the summary', 'summary stays the heading');
assert(summaryOnly.body === '', 'blank description is not repeated');
assert(summaryOnly.meta === '1 Nov 2026', 'single day, no venue');

console.log('PASS hero copy');
