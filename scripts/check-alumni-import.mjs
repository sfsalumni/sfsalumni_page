import { readFileSync } from 'fs';
import { planAlumniImport, readAlumniSheet, repairEmail, repairPhone } from '../lib/alumni-import.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(repairEmail('  Usha 21@ gmail.com ') === 'usha21@gmail.com', 'spaces around @ and in the local part are removed');
assert(repairEmail('aarbeehyd07@gmail. com') === 'aarbeehyd07@gmail.com', 'space after a dot in the domain is removed');
assert(repairEmail('anthoniamma.anthony@yahoo com') === 'anthoniamma.anthony@yahoo.com', 'a missing dot before com is restored');
assert(repairEmail('person@gmail,com') === 'person@gmail.com', 'a comma in the domain becomes a dot');
assert(repairEmail('not-an-email') === null, 'a value with no @ is not an email');
assert(repairEmail('') === null, 'blank email is not usable');

assert(repairPhone(8978355777) === '+918978355777', 'a 10-digit Indian mobile gets +91');
assert(repairPhone('9866373757') === '+919866373757', 'a string mobile gets +91');
assert(repairPhone('+1 202 555 0123') === '+12025550123', 'an explicit international number is kept');
assert(repairPhone('') === null, 'a blank phone is empty');
assert(repairPhone('123') === null, 'a too-short phone is not stored');

const ranged = planAlumniImport(
  [
    {
      firstName: 'Ada',
      lastName: 'Rao',
      year: '2025-26',
      section: 'B section',
      location: 'Hyderabad',
      phone: '9876543210',
      email: 'ada.rao@gmail.com',
    },
  ],
  []
);
assert(ranged.accounts[0].batch === 2026, 'a pass-out range uses the ending year');
assert(ranged.accounts[0].section === 'B', 'a section phrase keeps the letter');

const written = planAlumniImport(
  [
    {
      firstName: 'Bea',
      lastName: 'Rao',
      year: 'March 1994',
      section: '10A',
      location: 'Hyderabad',
      phone: '9876543210',
      email: 'bea.rao@gmail.com',
    },
    {
      firstName: 'Cid',
      lastName: 'Rao',
      year: '87',
      section: '"A"',
      location: 'Hyderabad',
      phone: '9876543210',
      email: 'cid.rao@gmail.com',
    },
    {
      firstName: 'Dee',
      lastName: 'Rao',
      year: '89-90',
      section: 'N/A',
      location: 'Hyderabad',
      phone: '9876543210',
      email: 'dee.rao@gmail.com',
    },
  ],
  []
);
assert(written.accounts[0].batch === 1994, 'a month and year keeps the year');
assert(written.accounts[0].section === 'A', 'a class-section like 10A keeps A');
assert(written.accounts[1].batch === 1987, 'a two-digit 87 is 1987');
assert(written.accounts[1].section === 'A', 'quoted section letters are kept');
assert(written.accounts[2].batch === 1990, 'a short range 89-90 ends in 1990');
assert(written.accounts[2].section === null, 'N/A is not a section');

const rows = [
  {
    firstName: 'Sridevi',
    lastName: 'Ayyagari',
    year: 1995,
    section: 'B',
    location: 'KPHB 6th Phase',
    phone: 8978355777,
    email: 'sridevi.nagendra@gmail.com',
  },
  {
    firstName: 'M Kiran ',
    lastName: '',
    year: '1990',
    section: 'b',
    location: '  Kapra, Hyderabad  ',
    phone: '',
    email: 'Kiran@Gmail.com',
  },
  {
    firstName: 'Again',
    lastName: 'Kiran',
    year: 1990,
    section: 'Z',
    location: 'Hyderabad',
    phone: '123',
    email: 'kiran@gmail.com',
  },
  {
    firstName: 'No Mail',
    lastName: 'Person',
    year: 1991,
    section: 'A',
    location: 'Hyderabad',
    phone: '9676782727',
    email: '',
  },
  {
    firstName: 'Taken',
    lastName: 'Already',
    year: 1984,
    section: 'A',
    location: '',
    phone: '9885270094',
    email: 'taken@yahoo.com',
  },
];

const { accounts, skipped } = planAlumniImport(rows, ['taken@yahoo.com']);

assert(accounts.length === 3, 'a row with no email still gets an account');
assert(accounts[0].email === 'sridevi.nagendra@gmail.com', 'email is the username source');
assert(accounts[0].username === 'sridevi.nagendra@gmail.com', 'username is the email');
assert(accounts[0].fullName === 'Sridevi Ayyagari', 'full name joins first and last');
assert(accounts[0].phone === '+918978355777', 'phone stored as E.164');
assert(accounts[0].batch === 1995, 'pass-out year is the batch');
assert(accounts[0].section === 'B', 'section kept');
assert(accounts[0].location === 'KPHB 6th Phase', 'location kept');
assert(!('food' in accounts[0]) && !('parking' in accounts[0]), 'event choices are not planned');

assert(accounts[1].email === 'kiran@gmail.com', 'email is lowercased');
assert(accounts[1].firstName === 'M Kiran', 'first name is trimmed');
assert(accounts[1].lastName === '', 'missing last name stays blank');
assert(accounts[1].fullName === 'M Kiran', 'full name is the first name when last is blank');
assert(accounts[1].section === 'B', 'section is uppercased');
assert(accounts[1].phone === null, 'blank phone stays empty');
assert(accounts[1].batch === 1990, 'numeric year string is a batch');

assert(accounts[2].email === '123@gmail.com', 'the first missing email becomes 123@gmail.com');
assert(accounts[2].username === '123@gmail.com', 'the default email is also the username');
assert(accounts[2].fullName === 'No Mail Person', 'the placeholder account keeps the name');

const placeholders = planAlumniImport(
  [
    { firstName: 'Ana', lastName: 'One', year: 1991, section: 'A', location: '', phone: '', email: '' },
    { firstName: 'Bea', lastName: 'Two', year: 1992, section: 'B', location: '', phone: '', email: 'not-an-email' },
  ],
  ['123@gmail.com']
);
assert(placeholders.accounts[0].email === '124@gmail.com', '123@gmail.com is skipped when it already exists');
assert(placeholders.accounts[1].email === '125@gmail.com', 'the next missing email takes the following number');

const repeat = planAlumniImport(
  [
    {
      firstName: 'No Mail',
      lastName: 'Person',
      year: 1991,
      section: 'A',
      location: 'Hyderabad',
      phone: '9676782727',
      email: '',
    },
  ],
  ['123@gmail.com'],
  { '123@gmail.com': '123@gmail.com' },
  [{ name: 'No Mail Person', phone: '+919676782727', email: '123@gmail.com', username: '123@gmail.com' }]
);
assert(repeat.accounts.length === 0, 'a placeholder person is not created twice');
assert(repeat.lines[0].status === 'existing', 'a repeat upload finds the saved account');
assert(repeat.lines[0].username === '123@gmail.com', 'a repeat upload shows the assigned username');

const twins = planAlumniImport(
  [
    {
      firstName: 'No Mail',
      lastName: 'Person',
      year: 1991,
      section: 'A',
      location: '',
      phone: '9676782727',
      email: '',
    },
  ],
  ['123@gmail.com', '124@gmail.com'],
  {},
  [
    { name: 'No Mail Person', phone: '+919676782727', email: '124@gmail.com', username: '124@gmail.com' },
    { name: 'No Mail Person', phone: '+919676782727', email: '123@gmail.com', username: '123@gmail.com' },
  ]
);
assert(twins.accounts.length === 0, 'duplicate saved placeholders do not create another account');
assert(twins.lines[0].username === '123@gmail.com', 'the earliest placeholder email is the username');

const named = planAlumniImport(rows, ['taken@yahoo.com'], { 'taken@yahoo.com': 'taken' });
const byName = Object.fromEntries(named.lines.map((line) => [line.name, line]));
assert(byName['Sridevi Ayyagari'].username === 'sridevi.nagendra@gmail.com', 'a new row keeps its email as the username');
assert(byName['Sridevi Ayyagari'].status === 'create', 'a new row is marked create');
assert(byName['Again Kiran'].status === 'duplicate', 'a repeated email is marked duplicate');
assert(byName['Again Kiran'].username === 'kiran@gmail.com', 'a duplicate shows the first username');
assert(byName['No Mail Person'].username === '123@gmail.com', 'a missing email shows the assigned username');
assert(byName['Taken Already'].status === 'existing', 'an address already stored is marked existing');
assert(byName['Taken Already'].username === 'taken', 'an existing account keeps its username');

const reasons = Object.fromEntries(skipped.map((row) => [row.email || row.name, row.reason]));
assert(reasons['kiran@gmail.com'] === 'duplicate-email', 'second copy of an email is skipped');
assert(reasons['No Mail Person'] === undefined, 'a row with no email is no longer skipped');
assert(reasons['taken@yahoo.com'] === 'existing', 'an email already in the database is skipped');
assert(skipped.find((row) => row.email === 'taken@yahoo.com').name === 'Taken Already', 'skip keeps the name');

const sheet = readAlumniSheet(readFileSync(new URL('../50th alumni.xlsx', import.meta.url)));
assert(sheet[0].firstName === 'Sridevi', 'workbook first name');
assert(sheet[0].lastName === 'Ayyagari', 'workbook last name');
assert(sheet[0].year === '1995', 'workbook year');
assert(sheet[0].email === 'sridevi.nagendra@gmail.com', 'workbook email');
assert(sheet.length > 800, 'workbook has the alumni rows');

console.log('check-alumni-import: PASS');
