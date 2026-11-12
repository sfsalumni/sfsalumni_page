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

const { mergeRegistrationPrefill } = await import('../lib/events/existing-registration.ts');

const merged = mergeRegistrationPrefill(
  {
    full_name: 'Ada Lovelace',
    last_name: 'Lovelace',
    email: 'ada@gmail.com',
    phone_number: '+919876543210',
    batch: 1999,
    section: 'B',
    current_location: 'Hyderabad, India',
  },
  {
    number_of_guests: 2,
    food_preference: 'non-veg',
    parking_needed: '4-wheeler',
    lunch: true,
    dinner: false,
    attending: true,
    phone_number: '+919876543210',
    payment_status: 'pending',
  }
);

assert.equal(merged.full_name, 'Ada Lovelace');
assert.equal(merged.last_name, 'Lovelace');
assert.equal(merged.batch, 1999);
assert.equal(merged.section, 'B');
assert.equal(merged.city, 'Hyderabad');
assert.equal(merged.country, 'India');
assert.equal(merged.number_of_guests, 2);
assert.equal(merged.lunch, true);
assert.equal(merged.dinner, false);
assert.equal(merged.parking_needed, '4-wheeler');
assert.equal(merged.food_preference, 'non-veg');
assert.equal(merged.payment_status, 'pending');

const alone = mergeRegistrationPrefill(
  { full_name: 'Solo', email: 'solo@gmail.com', current_location: 'Hyderabad, India' },
  {
    number_of_guests: 0,
    food_preference: 'veg',
    parking_needed: 'none',
    lunch: true,
    dinner: false,
    attending: true,
    payment_status: 'pending',
  }
);
assert.equal(alone.number_of_guests, 1, '0 people in DB still defaults to 1');

const empty = mergeRegistrationPrefill({ full_name: 'New', email: 'n@gmail.com' }, null);
assert.equal(empty.number_of_guests, 1, 'no registration defaults to 1');

const noFood = mergeRegistrationPrefill(
  { full_name: 'Skip', email: 'skip@gmail.com' },
  {
    number_of_guests: 1,
    food_preference: 'none',
    parking_needed: '4-wheeler',
    lunch: false,
    dinner: false,
    attending: true,
    payment_status: 'pending',
  }
);
assert.equal(noFood.food_preference, 'none');
assert.equal(noFood.lunch, false);
assert.equal(noFood.dinner, false);

const party = mergeRegistrationPrefill(
  { full_name: 'Party', email: 'p@gmail.com' },
  {
    number_of_guests: 2,
    food_preference: 'veg',
    parking_needed: 'none',
    lunch: true,
    dinner: false,
    attending: true,
    payment_status: 'pending',
    guests: [
      { preference: 'veg', lunch: true, dinner: false },
      { preference: 'non-veg', lunch: false, dinner: true },
    ],
  }
);
assert.equal(party.guests.length, 2);
assert.equal(party.guests[1].preference, 'non-veg');

console.log('PASS registration prefill merge');
