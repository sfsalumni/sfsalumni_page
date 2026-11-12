import { passwordsMatch, resolveUsername, usernameError } from '../lib/auth/identity.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(resolveUsername('', 'Ada@Gmail.com') === 'ada@gmail.com', 'blank username defaults to email');
assert(resolveUsername('  Ada.Rao ', 'ada@gmail.com') === 'ada.rao', 'custom username is trimmed and lowercased');
assert(usernameError('') !== null, 'username with no email fallback is rejected');
assert(usernameError('ada@gmail.com') === null, 'email is a valid default username');
assert(usernameError('ada.rao') === null, 'dotted username is valid');
assert(usernameError('ab') !== null, 'username shorter than 3 is rejected');
assert(usernameError('ada rao') !== null, 'spaces are rejected');
assert(passwordsMatch('longenough', 'longenough') === true, 'matching passwords');
assert(passwordsMatch('longenough', 'different') === false, 'mismatch');
assert(passwordsMatch('', '') === false, 'empty passwords do not match');

console.log('check-account-identity: PASS');
