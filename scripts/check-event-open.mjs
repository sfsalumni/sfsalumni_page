import { eventIsOpen } from '../lib/events/open.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const now = new Date('2026-10-26T07:30:00.000Z');
assert(
  eventIsOpen({ published: true, starts_at: '2026-12-20T04:30:00.000Z', ends_at: null }, now),
  'future event is open'
);
assert(
  eventIsOpen(
    {
      published: true,
      starts_at: '2026-10-26T07:26:00.000Z',
      ends_at: '2026-12-06T07:26:00.000Z',
    },
    now
  ),
  'started event stays open until it ends'
);
assert(
  !eventIsOpen({ published: true, starts_at: '2026-10-01T00:00:00.000Z', ends_at: null }, now),
  'started event with no end is closed'
);
assert(
  !eventIsOpen(
    {
      published: true,
      starts_at: '2026-01-01T00:00:00.000Z',
      ends_at: '2026-01-02T00:00:00.000Z',
    },
    now
  ),
  'finished event is closed'
);
assert(
  !eventIsOpen({ published: false, starts_at: '2026-12-20T04:30:00.000Z', ends_at: null }, now),
  'draft is closed'
);

console.log('PASS event open');
