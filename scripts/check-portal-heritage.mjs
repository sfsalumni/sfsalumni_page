import assert from 'node:assert/strict';
import { firstNameFromFullName } from '../lib/portal/welcome.ts';
import { primaryNextAction } from '../lib/portal/next-action.ts';
import { filterDirectoryRows } from '../lib/directory/search.ts';

assert.equal(firstNameFromFullName('Anita Rao'), 'Anita');
assert.equal(firstNameFromFullName('  '), 'friend');

assert.equal(primaryNextAction({ hasRegistration: false, anyUnpaid: false }).kind, 'register');
assert.equal(
  primaryNextAction({
    hasRegistration: true,
    anyUnpaid: true,
    continueHref: '/registration?event=x',
  }).href.includes('registration'),
  true
);
assert.equal(primaryNextAction({ hasRegistration: true, anyUnpaid: false }).kind, 'pass_ready');

const rows = [
  {
    id: '1',
    full_name: 'Anita Rao',
    batch: 1999,
    username: 'anita',
    current_location: 'Hyderabad',
    profession: 'Doctor',
  },
  {
    id: '2',
    full_name: 'Ben Ali',
    batch: 2001,
    username: 'ben',
    current_location: 'Bengaluru',
    profession: 'Engineer',
  },
];
assert.equal(filterDirectoryRows(rows, { q: 'hyd', batch: null }).map((r) => r.id).join(), '1');
assert.equal(filterDirectoryRows(rows, { q: '1999', batch: null }).map((r) => r.id).join(), '1');
assert.equal(filterDirectoryRows(rows, { q: '', batch: 2001 }).map((r) => r.id).join(), '2');
assert.equal(filterDirectoryRows(rows, { q: 'ben', batch: 2001 }).map((r) => r.id).join(), '2');
assert.equal(filterDirectoryRows(rows, { q: 'ben', batch: 1999 }).length, 0);

console.log('PASS portal heritage self-check');
