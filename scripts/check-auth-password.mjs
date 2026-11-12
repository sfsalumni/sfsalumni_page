import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { register } from 'node:module';

// Load compiled-free TS via dynamic import after building with a tiny inline check using bcryptjs directly
// Prefer importing the built helpers: use tsx if available, else duplicate minimal assert with bcryptjs.

import bcrypt from 'bcryptjs';

const hash = await bcrypt.hash('secret', 10);
const ok = await bcrypt.compare('secret', hash);
const bad = await bcrypt.compare('wrong', hash);
if (!ok || bad) {
  console.error('FAIL password self-check');
  process.exit(1);
}
console.log('PASS password self-check');
