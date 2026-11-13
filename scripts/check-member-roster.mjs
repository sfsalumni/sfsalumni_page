/**
 * Self-check for member roster normalize + match (no DB).
 * Run: node --experimental-strip-types scripts/check-member-roster.mjs
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
registerHooks({
  resolve(specifier, context, nextResolve) {
    let spec = specifier;
    if (spec.startsWith('@/')) spec = pathToFileURL(path.join(root, spec.slice(2))).href;
    if (spec.startsWith('.')) {
      const parent = context.parentURL ? fileURLToPath(context.parentURL) : root;
      const abs = path.resolve(path.dirname(parent), spec);
      if (!path.extname(abs) && existsSync(`${abs}.ts`)) spec = pathToFileURL(`${abs}.ts`).href;
    } else if (spec.startsWith('file:')) {
      const abs = fileURLToPath(spec);
      if (!path.extname(abs) && existsSync(`${abs}.ts`)) spec = pathToFileURL(`${abs}.ts`).href;
    }
    return nextResolve(spec, context);
  },
});

const {
  normalizeRosterPhones,
  normalizeRosterEmail,
  parseUniqueRecordRow,
  matchRosterRows,
  rosterRowToPrefill,
  planMemberRosterImport,
  toMemberRosterUpsert,
  assertRosterLookupQuery,
} = await import('../lib/registration/roster.ts');

assert.deepEqual(normalizeRosterPhones('919573344609'), ['+919573344609']);
assert.deepEqual(normalizeRosterPhones('9573344609'), ['+919573344609']);
assert.deepEqual(normalizeRosterPhones('919143287888; 916282940661'), [
  '+919143287888',
  '+916282940661',
]);
assert.deepEqual(normalizeRosterPhones('9000000000'), []);
assert.deepEqual(normalizeRosterPhones(''), []);

assert.equal(normalizeRosterEmail('Abhi@Gmail.com'), 'abhi@gmail.com');
assert.equal(normalizeRosterEmail('not-an-email'), null);

const parsed = parseUniqueRecordRow({
  'Record ID': 'ALU-0001',
  'Given name': 'G.Abhinav Raj',
  'Last name': '',
  'Pass-out year': '2020',
  Section: 'B',
  'Current location': 'Secunderabad',
  'Normalized phone(s)': '919573344609',
  'Valid normalized email': 'abhigajapaka51@gmail.com',
  Attendance: 'Yes',
  'Known confirmed guests': '0',
  'Food preference': 'Non-Veg',
  Parking: '2-wheeler',
});
assert.equal(parsed.record_id, 'ALU-0001');
assert.equal(parsed.given_name, 'G.Abhinav Raj');
assert.equal(parsed.batch, 2020);
assert.equal(parsed.section, 'B');
assert.equal(parsed.email, 'abhigajapaka51@gmail.com');
assert.deepEqual(parsed.phones, ['+919573344609']);
assert.equal(parsed.food_preference, 'non-veg');
assert.equal(parsed.has_parking, true);
assert.equal(parsed.two_wheeler_count, 1);
assert.equal(parsed.four_wheeler_count, 0);
assert.equal(parsed.number_of_guests, 0);
assert.equal(parsed.attending, true);

const parking4 = parseUniqueRecordRow({
  'Record ID': 'ALU-0002',
  'Given name': 'Ada',
  'Last name': 'Lovelace',
  'Pass-out year': '1989',
  Section: 'A',
  'Normalized phone(s)': '919848005895',
  'Valid normalized email': 'ada@gmail.com',
  Attendance: 'Yes',
  'Known confirmed guests': '1',
  'Food preference': 'Veg',
  Parking: '4-wheeler',
});
assert.equal(parking4.has_parking, true);
assert.equal(parking4.four_wheeler_count, 1);
assert.equal(parking4.number_of_guests, 1);

const noPark = parseUniqueRecordRow({
  'Record ID': 'ALU-0003',
  'Given name': 'No',
  'Last name': 'Park',
  'Pass-out year': '1990',
  Parking: 'Unspecified',
  Attendance: 'No',
});
assert.equal(noPark.has_parking, false);
assert.equal(noPark.attending, false);

const rows = [
  {
    id: 'u1',
    record_id: 'ALU-1',
    given_name: 'Ada',
    last_name: 'Lovelace',
    full_name: 'Ada Lovelace',
    email: 'ada@gmail.com',
    phones: ['+919876543210'],
    batch: 1999,
    section: 'B',
    current_location: 'Hyderabad, India',
    food_preference: 'veg',
    number_of_guests: 1,
    has_parking: true,
    two_wheeler_count: 0,
    four_wheeler_count: 1,
    attending: true,
  },
  {
    id: 'u2',
    record_id: 'ALU-2',
    given_name: 'Shaik',
    last_name: 'Ali',
    full_name: 'Shaik Ali',
    email: 'shaik1@gmail.com',
    phones: ['+919111111111'],
    batch: 2001,
    section: 'A',
    current_location: null,
    food_preference: 'non-veg',
    number_of_guests: 0,
    has_parking: false,
    two_wheeler_count: 0,
    four_wheeler_count: 0,
    attending: true,
  },
  {
    id: 'u3',
    record_id: 'ALU-3',
    given_name: 'Shaik',
    last_name: 'Khan',
    full_name: 'Shaik Khan',
    email: 'shaik2@gmail.com',
    phones: ['+919222222222'],
    batch: 2002,
    section: 'C',
    current_location: null,
    food_preference: 'veg',
    number_of_guests: 0,
    has_parking: false,
    two_wheeler_count: 0,
    four_wheeler_count: 0,
    attending: true,
  },
];

const exact = matchRosterRows(rows, { phone: '+919876543210', email: 'ada@gmail.com' });
assert.equal(exact.kind, 'exact');
assert.equal(exact.matches.length, 1);
assert.equal(exact.matches[0].record_id, 'ALU-1');

const phoneOnly = matchRosterRows(rows, { phone: '9876543210', email: 'other@gmail.com' });
assert.equal(phoneOnly.kind, 'confirm');
assert.equal(phoneOnly.matches[0].match_type, 'phone_only');

const emailOnly = matchRosterRows(rows, { phone: '+919999999999', email: 'ada@gmail.com' });
assert.equal(emailOnly.kind, 'confirm');
assert.equal(emailOnly.matches[0].match_type, 'email_only');

const nameHits = matchRosterRows(rows, { name: 'Shaik' });
assert.equal(nameHits.kind, 'confirm');
assert.equal(nameHits.matches.length, 2);
assert.ok(nameHits.matches.every((m) => m.match_type === 'name'));

const none = matchRosterRows(rows, { phone: '+919000000001', email: 'nobody@gmail.com', name: 'Zzz' });
assert.equal(none.kind, 'none');
assert.equal(none.matches.length, 0);

const prefill = rosterRowToPrefill(rows[0], 'exact');
assert.equal(prefill.id, 'u1');
assert.equal(prefill.full_name, 'Ada Lovelace');
assert.equal(prefill.batch, 1999);
assert.equal(prefill.number_of_guests, 1);
assert.equal(prefill.has_parking, true);
assert.equal(prefill.four_wheeler_count, 1);
assert.equal(prefill.match_type, 'exact');

const planned = planMemberRosterImport([
  {
    'Record ID': 'ALU-0001',
    'Given name': 'Ada',
    'Last name': 'Lovelace',
    'Pass-out year': '1999',
    Section: 'B',
    'Normalized phone(s)': '919876543210',
    'Valid normalized email': 'ada@gmail.com',
    Attendance: 'Yes',
    'Known confirmed guests': '1',
    'Food preference': 'Veg',
    Parking: '4-wheeler',
  },
  {
    'Record ID': '',
    'Given name': 'NoId',
  },
  {
    'Record ID': 'ALU-0001',
    'Given name': 'Ada Dup',
    'Last name': 'Lovelace',
    'Pass-out year': '1999',
  },
]);
assert.equal(planned.rows.length, 1);
assert.equal(planned.skipped, 2);
assert.equal(planned.rows[0].record_id, 'ALU-0001');
assert.equal(planned.rows[0].email, 'ada@gmail.com');
assert.deepEqual(planned.rows[0].phones, ['+919876543210']);

const upsert = toMemberRosterUpsert(parsed);
assert.equal(upsert.record_id, 'ALU-0001');
assert.equal(upsert.food_preference, 'non-veg');
assert.ok(Array.isArray(upsert.phones));

assert.equal(assertRosterLookupQuery({ phone: '+919876543210' }).ok, true);
assert.equal(assertRosterLookupQuery({ email: 'ada@gmail.com' }).ok, true);
assert.equal(assertRosterLookupQuery({ name: 'Ada' }).ok, false);
assert.equal(assertRosterLookupQuery({ phone: '', email: '', name: 'Ada' }).ok, false);
assert.equal(assertRosterLookupQuery({ phone: '+919876543210', name: 'Ada' }).ok, true);

console.log('check-member-roster: ok');
