/**
 * Self-check for per-event Instagram URL normalize (no DB).
 * Run: node --experimental-strip-types scripts/check-event-instagram.mjs
 */
import { normalizeInstagramUrl } from '../lib/events/instagram.ts';

if (normalizeInstagramUrl('') !== null) throw new Error('empty should be null');
if (normalizeInstagramUrl('   ') !== null) throw new Error('blank should be null');

try {
  normalizeInstagramUrl('not-a-url');
  throw new Error('expected invalid url');
} catch (e) {
  if (!(e instanceof Error) || !/http\(s\)/i.test(e.message)) throw e;
}

try {
  normalizeInstagramUrl('ftp://instagram.com/x');
  throw new Error('expected bad protocol');
} catch (e) {
  if (!(e instanceof Error) || !/http\(s\)/i.test(e.message)) throw e;
}

const ok = normalizeInstagramUrl('  https://www.instagram.com/sfs.alumni.group/reels/  ');
if (ok !== 'https://www.instagram.com/sfs.alumni.group/reels/') {
  throw new Error(`unexpected normalize: ${ok}`);
}

console.log('PASS event instagram normalize');
