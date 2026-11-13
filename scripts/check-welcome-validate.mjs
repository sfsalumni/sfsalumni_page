/**
 * Self-check for welcome message field validation (no DB).
 * Run: node --experimental-strip-types scripts/check-welcome-validate.mjs
 */
import {
  assertWelcomeFields,
  splitWelcomeBody,
  welcomeObjectPath,
} from '../lib/welcome/validate.ts';

try {
  assertWelcomeFields({
    person_name: '',
    person_title: 'Principal',
    headline: 'Welcome',
    body: 'Hello',
  });
  throw new Error('expected name required');
} catch (e) {
  if (!(e instanceof Error) || !/name/i.test(e.message)) throw e;
}

try {
  assertWelcomeFields({
    person_name: 'Fr. Anil',
    person_title: 'Principal',
    headline: 'Welcome',
    body: '',
  });
  throw new Error('expected body required');
} catch (e) {
  if (!(e instanceof Error) || !/body/i.test(e.message)) throw e;
}

const ok = assertWelcomeFields({
  leadership_label: '  School Leadership  ',
  person_name: 'Fr. Anil Kumar R',
  person_title: 'Principal, SFS Shanthinagar',
  theme: 'Aspire to Achieve',
  headline: "Principal's Jubilee Welcome Message",
  body: 'Para one.\n\nPara two.',
  quote: '  Courage counts.  ',
  signature_name: 'Rev. Fr. Anil Kumar R',
  signature_role: 'Principal • Golden Jubilee Year',
  cta_label: '',
  cta_href: '',
  published: 'true',
});

if (ok.leadership_label !== 'School Leadership') throw new Error('bad label');
if (ok.person_name !== 'Fr. Anil Kumar R') throw new Error('bad name');
if (ok.quote !== 'Courage counts.') throw new Error('bad quote trim');
if (ok.cta_label !== 'Reconnect with SFS') throw new Error('bad cta default');
if (ok.cta_href !== '#gallery-section') throw new Error('bad cta href default');
if (!ok.published) throw new Error('bad published');
if (!ok.style || ok.style.theme !== 'default' || ok.style.font !== 'sans' || ok.style.size !== 'm') {
  throw new Error('bad default style');
}

const paras = splitWelcomeBody(ok.body);
if (paras.length !== 2 || paras[0] !== 'Para one.' || paras[1] !== 'Para two.') {
  throw new Error(`bad body split: ${JSON.stringify(paras)}`);
}

try {
  assertWelcomeFields({
    person_name: 'X',
    person_title: 'Y',
    headline: 'H',
    body: 'x'.repeat(8001),
  });
  throw new Error('expected body length fail');
} catch (e) {
  if (!(e instanceof Error) || !/body/i.test(e.message)) throw e;
}

const path = welcomeObjectPath('jpg');
if (path !== 'welcome/portrait.jpg') throw new Error(`bad path ${path}`);

console.log('ok: welcome validate');
