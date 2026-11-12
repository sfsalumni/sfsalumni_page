import assert from 'node:assert/strict';
import { assertStorySubmit } from '../lib/stories/validate.ts';

assert.equal(assertStorySubmit({ title: '  Hello ', body: 'Once upon…' }).title, 'Hello');
assert.throws(() => assertStorySubmit({ title: '', body: 'x' }), /Title is required/);
assert.throws(() => assertStorySubmit({ title: 'x', body: '' }), /Story text is required/);
assert.throws(
  () => assertStorySubmit({ title: 'x'.repeat(121), body: 'y' }),
  /120 characters/
);

console.log('PASS stories validate self-check');
