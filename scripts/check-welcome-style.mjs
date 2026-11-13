/**
 * Self-check for welcome style + markup (no DB).
 * Run: node --experimental-strip-types scripts/check-welcome-style.mjs
 */
import { assertWelcomeStyle, resolveWelcomeStyle } from '../lib/welcome/style.ts';
import { parseWelcomeMarkup, wrapWelcomeMarkup } from '../lib/welcome/markup.ts';

try {
  assertWelcomeStyle({ theme: 'neon', font: 'sans', size: 'm' });
  throw new Error('expected invalid theme');
} catch (e) {
  if (!(e instanceof Error) || !/theme/i.test(e.message)) throw e;
}

try {
  assertWelcomeStyle({
    theme: 'default',
    font: 'sans',
    size: 'm',
    headlineColor: 'red',
  });
  throw new Error('expected invalid hex');
} catch (e) {
  if (!(e instanceof Error) || !/color/i.test(e.message)) throw e;
}

const style = assertWelcomeStyle({
  theme: 'bronze',
  font: 'serif',
  size: 'l',
  headlineColor: '  #8A6A3A  ',
  bodyColor: null,
  accentColor: '#3d6b5c',
});
if (style.theme !== 'bronze') throw new Error('bad theme');
if (style.font !== 'serif') throw new Error('bad font');
if (style.size !== 'l') throw new Error('bad size');
if (style.headlineColor !== '#8A6A3A') throw new Error('bad headline hex normalize');
if (style.bodyColor !== null) throw new Error('bad body null');
if (style.accentColor !== '#3d6b5c') throw new Error('bad accent');

const resolved = resolveWelcomeStyle(style);
if (!resolved.headlineColor) throw new Error('missing resolved headline');
if (!resolved.bodyColor) throw new Error('missing resolved body');
if (!resolved.accentColor) throw new Error('missing resolved accent');
if (resolved.fontFamily !== 'serif') throw new Error('bad resolved font');
if (resolved.size !== 'l') throw new Error('bad resolved size');

const defaulted = assertWelcomeStyle(undefined);
if (defaulted.theme !== 'default' || defaulted.font !== 'sans' || defaulted.size !== 'm') {
  throw new Error('bad defaults');
}

const segs = parseWelcomeMarkup('Hello **bold** and *italic* and ==mark== end');
const kinds = segs.map((s) => s.kind).join(',');
if (kinds !== 'text,bold,text,italic,text,mark,text') {
  throw new Error(`bad kinds: ${kinds}`);
}
if (segs[1].text !== 'bold' || segs[3].text !== 'italic' || segs[5].text !== 'mark') {
  throw new Error('bad segment text');
}

const plain = parseWelcomeMarkup('No markup here');
if (plain.length !== 1 || plain[0].kind !== 'text' || plain[0].text !== 'No markup here') {
  throw new Error('bad plain');
}

const wrapped = wrapWelcomeMarkup('say hello world', 4, 9, 'bold');
if (wrapped !== 'say **hello** world') throw new Error(`bad wrap bold: ${wrapped}`);

const marked = wrapWelcomeMarkup('note key words here', 5, 14, 'mark');
if (marked !== 'note ==key words== here') throw new Error(`bad wrap mark: ${marked}`);

console.log('ok: welcome style');
