/**
 * Self-check for site links validation (no DB).
 * Run: node --experimental-strip-types scripts/check-site-links-validate.mjs
 */
import { assertSiteLinksFields, publicInstagramLink } from '../lib/site-links/validate.ts';

try {
  assertSiteLinksFields({
    instagram_url: 'not-a-url',
    instagram_label: 'Instagram',
    published: true,
  });
  throw new Error('expected bad url');
} catch (e) {
  if (!(e instanceof Error) || !/instagram/i.test(e.message)) throw e;
}

const blank = assertSiteLinksFields({
  instagram_url: '  ',
  instagram_label: '',
  published: 'true',
});
if (blank.instagram_url !== null) throw new Error('blank url should be null');
if (blank.instagram_label !== 'Instagram') throw new Error('default label');
if (!blank.published) throw new Error('published');

const ok = assertSiteLinksFields({
  instagram_url: 'https://www.instagram.com/sfs.alumni/',
  instagram_label: '  Follow us  ',
  published: true,
});
if (ok.instagram_url !== 'https://www.instagram.com/sfs.alumni/') throw new Error('url');
if (ok.instagram_label !== 'Follow us') throw new Error('label trim');

const hidden = publicInstagramLink({
  instagram_url: 'https://instagram.com/x',
  instagram_label: 'Instagram',
  published: false,
});
if (hidden !== null) throw new Error('unpublished hides link');

const shown = publicInstagramLink({
  instagram_url: 'https://instagram.com/x',
  instagram_label: 'Instagram',
  published: true,
});
if (!shown || shown.href !== 'https://instagram.com/x') throw new Error('published shows link');

console.log('ok: site links validate');
