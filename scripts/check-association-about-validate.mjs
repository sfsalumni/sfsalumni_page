/**
 * Self-check for association about field validation (no DB).
 * Run: node --experimental-strip-types scripts/check-association-about-validate.mjs
 */
import { assertAssociationAboutFields } from '../lib/association/validate.ts';

try {
  assertAssociationAboutFields({
    eyebrow: 'ABOUT',
    title: 'Title',
    purpose_heading: 'Our purpose',
    purpose_body: '',
    highlight_eyebrow: '1976–2026',
    highlight_title: '50 years',
    highlight_body: 'Legacy',
  });
  throw new Error('expected purpose body required');
} catch (e) {
  if (!(e instanceof Error) || !/purpose body/i.test(e.message)) throw e;
}

try {
  assertAssociationAboutFields({
    eyebrow: 'ABOUT',
    title: '',
    purpose_heading: 'Our purpose',
    purpose_body: 'Body',
    highlight_eyebrow: '1976–2026',
    highlight_title: '50 years',
    highlight_body: 'Legacy',
  });
  throw new Error('expected title required');
} catch (e) {
  if (!(e instanceof Error) || !/title/i.test(e.message)) throw e;
}

const ok = assertAssociationAboutFields({
  eyebrow: '  ABOUT THE SFS ALUMNI ASSOCIATION  ',
  title: 'An association for every generation',
  purpose_heading: 'Our purpose',
  purpose_body: 'Mission paragraph.',
  purpose_note: '  Proposed copy.  ',
  cta_label: '',
  cta_href: '',
  highlight_eyebrow: '1976–2026',
  highlight_title: '50 years of SFS',
  highlight_body: 'A school legacy.',
  published: 'true',
});

if (ok.eyebrow !== 'ABOUT THE SFS ALUMNI ASSOCIATION') throw new Error('bad eyebrow');
if (ok.purpose_note !== 'Proposed copy.') throw new Error('bad note trim');
if (ok.cta_label !== 'Visit member portal ↗') throw new Error('bad cta default');
if (ok.cta_href !== '/member') throw new Error('bad cta href default');
if (!ok.published) throw new Error('bad published');

try {
  assertAssociationAboutFields({
    eyebrow: 'A',
    title: 'T',
    purpose_heading: 'H',
    purpose_body: 'x'.repeat(8001),
    highlight_eyebrow: 'E',
    highlight_title: 'T',
    highlight_body: 'B',
  });
  throw new Error('expected purpose body length fail');
} catch (e) {
  if (!(e instanceof Error) || !/purpose body/i.test(e.message)) throw e;
}

try {
  assertAssociationAboutFields({
    eyebrow: 'A',
    title: 'T',
    purpose_heading: 'H',
    purpose_body: 'Body',
    cta_href: 'javascript:alert(1)',
    highlight_eyebrow: 'E',
    highlight_title: 'T',
    highlight_body: 'B',
  });
  throw new Error('expected bad cta href');
} catch (e) {
  if (!(e instanceof Error) || !/CTA link/i.test(e.message)) throw e;
}

console.log('ok: association about validate');
