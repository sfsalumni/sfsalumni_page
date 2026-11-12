import { readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3000';
const creds = JSON.parse(readFileSync('/tmp/sfs-memories-test-creds.json', 'utf8'));

const jpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQACEADAAAABQP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
  'base64'
);
writeFileSync('/tmp/sfs-mem.jpg', jpeg);

function curl(args) {
  const r = spawnSync('curl', ['-s', ...args], { encoding: 'utf8', maxBuffer: 5_000_000 });
  if (r.status !== 0) throw new Error(`curl failed: ${r.stderr || r.error}`);
  return r.stdout;
}

function jar(path) {
  return ['-c', path, '-b', path];
}

const results = [];

function step(name, fn) {
  try {
    const out = fn();
    results.push({ name, ok: true, out });
    console.log('PASS', name, typeof out === 'string' ? out.slice(0, 180) : JSON.stringify(out).slice(0, 180));
  } catch (e) {
    results.push({ name, ok: false, error: String(e.message || e) });
    console.error('FAIL', name, e.message || e);
    process.exitCode = 1;
  }
}

step('unauth GET 401', () => {
  const body = curl([`${BASE}/api/memories`]);
  const j = JSON.parse(body);
  if (!/sign in/i.test(j.error || '')) throw new Error(body);
  return j.error;
});

step('member login', () => {
  const body = curl([
    ...jar('/tmp/sfs-member.jar'),
    '-X',
    'POST',
    `${BASE}/api/auth/login`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ email: creds.memberEmail, password: creds.password }),
  ]);
  const j = JSON.parse(body);
  if (!j.ok) throw new Error(body);
  return 'ok';
});

step('POST without consent → 400', () => {
  const body = curl([
    ...jar('/tmp/sfs-member.jar'),
    '-X',
    'POST',
    `${BASE}/api/memories`,
    '-F',
    'title=No consent',
    '-F',
    'batch_year=1999',
    '-F',
    'image=@/tmp/sfs-mem.jpg;type=image/jpeg',
  ]);
  const j = JSON.parse(body);
  if (!/consent/i.test(j.error || '')) throw new Error(body);
  return j.error;
});

let memId = '';
step('POST with consent', () => {
  const body = curl([
    ...jar('/tmp/sfs-member.jar'),
    '-X',
    'POST',
    `${BASE}/api/memories`,
    '-F',
    'title=Local test reunion',
    '-F',
    'description=api smoke',
    '-F',
    'batch_year=1999',
    '-F',
    'consent=true',
    '-F',
    'image=@/tmp/sfs-mem.jpg;type=image/jpeg',
  ]);
  const j = JSON.parse(body);
  if (!j.ok || !j.memory?.id) throw new Error(body);
  memId = j.memory.id;
  if (j.memory.status !== 'pending') throw new Error('expected pending');
  if (!String(j.memory.storage_path || '').startsWith('batch/1999/')) throw new Error(j.memory.storage_path);
  return memId;
});

step('pending hidden from browse', () => {
  const j = JSON.parse(curl([...jar('/tmp/sfs-member.jar'), `${BASE}/api/memories`]));
  const ids = [...(j.ownBatch || []), ...(j.allSfs || [])].map((r) => r.id);
  if (ids.includes(memId)) throw new Error('pending leaked into browse');
  return { own: j.ownBatch?.length, all: j.allSfs?.length };
});

step('mine lists pending', () => {
  const j = JSON.parse(curl([...jar('/tmp/sfs-member.jar'), `${BASE}/api/memories/mine`]));
  const row = (j.submissions || []).find((s) => s.id === memId);
  if (!row || row.status !== 'pending') throw new Error(JSON.stringify(j));
  return row.status;
});

step('admin login', () => {
  const body = curl([
    ...jar('/tmp/sfs-admin.jar'),
    '-X',
    'POST',
    `${BASE}/api/auth/login`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ email: creds.adminEmail, password: creds.password }),
  ]);
  if (!JSON.parse(body).ok) throw new Error(body);
  return 'ok';
});

step('admin approve', () => {
  const body = curl([
    ...jar('/tmp/sfs-admin.jar'),
    '-X',
    'PATCH',
    `${BASE}/api/admin/memories/${memId}`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ status: 'published' }),
  ]);
  if (!JSON.parse(body).ok) throw new Error(body);
  return 'ok';
});

let mem2 = '';
step('POST general + approve', () => {
  const body = curl([
    ...jar('/tmp/sfs-member.jar'),
    '-X',
    'POST',
    `${BASE}/api/memories`,
    '-F',
    'title=General campus',
    '-F',
    'batch_year=general',
    '-F',
    'consent=true',
    '-F',
    'image=@/tmp/sfs-mem.jpg;type=image/jpeg',
  ]);
  const j = JSON.parse(body);
  if (!j.ok) throw new Error(body);
  mem2 = j.memory.id;
  if (!String(j.memory.storage_path || '').startsWith('general/')) throw new Error(j.memory.storage_path);
  const ap = curl([
    ...jar('/tmp/sfs-admin.jar'),
    '-X',
    'PATCH',
    `${BASE}/api/admin/memories/${mem2}`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ status: 'published' }),
  ]);
  if (!JSON.parse(ap).ok) throw new Error(ap);
  return mem2;
});

step('partition B: own vs all, no dup, signed url', () => {
  const j = JSON.parse(curl([...jar('/tmp/sfs-member.jar'), `${BASE}/api/memories`]));
  const own = j.ownBatch || [];
  const all = j.allSfs || [];
  if (!own.some((r) => r.id === memId)) throw new Error('1999 not in ownBatch');
  if (all.some((r) => r.id === memId)) throw new Error('own batch duplicated in allSfs');
  if (!all.some((r) => r.id === mem2)) throw new Error('general not in allSfs');
  if (own.some((r) => r.id === mem2)) throw new Error('general wrongly in ownBatch');
  const signed = own.find((r) => r.id === memId)?.image_url;
  if (!signed || !/^https?:\/\//.test(signed)) throw new Error('missing signed url');
  return { own: own.length, all: all.length };
});

step('nav labels on memories HTML', () => {
  const html = curl([...jar('/tmp/sfs-member.jar'), `${BASE}/memories`]);
  for (const label of ['Home', 'People', 'Events', 'Stories', 'Memories']) {
    if (!html.includes(label)) throw new Error(`missing nav ${label}`);
  }
  if (html.includes('>Association<') || html.includes('>Alumni directory<')) {
    throw new Error('old nav labels still present');
  }
  return 'ok';
});

console.log('\nSmoke complete. fails=', results.filter((r) => !r.ok).length);
