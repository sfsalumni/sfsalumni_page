/**
 * Self-check for association body block parsing (no DB).
 * Run: node --experimental-strip-types scripts/check-association-body.mjs
 */
import { parseAssociationBody } from '../lib/association/body.ts';

const plain = parseAssociationBody('One paragraph only.');
if (plain.length !== 1 || plain[0].type !== 'p' || plain[0].text !== 'One paragraph only.') {
  throw new Error('plain paragraph failed');
}

const multi = parseAssociationBody('First.\n\nSecond.');
if (multi.length !== 2 || multi[0].text !== 'First.' || multi[1].text !== 'Second.') {
  throw new Error('multi paragraph failed');
}

const list = parseAssociationBody('Intro\n\n- Alpha\n* Beta\n• Gamma\n\nOutro');
if (list.length !== 3) throw new Error(`expected 3 blocks, got ${list.length}`);
if (list[0].type !== 'p' || list[0].text !== 'Intro') throw new Error('intro');
if (list[1].type !== 'ul' || list[1].items.join('|') !== 'Alpha|Beta|Gamma') {
  throw new Error(`list items: ${JSON.stringify(list[1])}`);
}
if (list[2].type !== 'p' || list[2].text !== 'Outro') throw new Error('outro');

const soft = parseAssociationBody('Line one\nLine two');
if (soft.length !== 1 || soft[0].type !== 'p' || soft[0].text !== 'Line one\nLine two') {
  throw new Error('soft newline failed');
}

console.log('PASS association body parse');
