/**
 * ponytail: ceiling = static nav inventory so a regroup never drops a route.
 * Upgrade: Playwright click each admin link.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shell = readFileSync(join(root, 'components/admin-shell.tsx'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const required = [
  '/admin',
  '/admin/event-ops',
  '/admin/approvals',
  '/admin/check-in',
  '/admin/broadcast',
  '/admin/events',
  '/admin/registrations',
  '/admin/membership',
  '/admin/import',
  '/admin/maintenance',
  '/admin/memories',
  '/admin/stories',
  '/admin/welcome',
  '/admin/association',
  '/admin/committee',
  '/admin/donations',
  '/admin/payment-accounts',
];

for (const href of required) {
  assert(shell.includes(`href: '${href}'`) || shell.includes(`href: "${href}"`), `missing ${href}`);
}

assert(shell.includes("label: 'Day of'"), 'Day of group');
assert(shell.includes("label: 'Events & people'"), 'Events & people group');
assert(shell.includes("label: 'Content'"), 'Content group');
assert(shell.includes("label: 'Money'"), 'Money group');
assert(shell.includes('text-academic-teal'), 'day-of accent');
assert(shell.includes('text-jubilee-gold-deep'), 'events accent');
assert(shell.includes('text-jubilee-amber'), 'money accent');
assert(shell.includes('space_dashboard') || shell.includes('monitoring'), 'enhanced icons');

console.log('PASS admin shell nav');
