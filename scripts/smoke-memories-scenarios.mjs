/**
 * Multi-picture memories scenarios against local Next + Supabase.
 * Usage: node scripts/smoke-memories-scenarios.mjs
 * Optional: SMOKE_BASE=http://127.0.0.1:3000 KEEP=1 (skip cleanup)
 */
import { readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import bcrypt from 'bcryptjs';
import { deflateSync } from 'zlib';

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3000';
const KEEP = process.env.KEEP === '1';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
const sbHeaders = {
  apikey: sbKey,
  Authorization: `Bearer ${sbKey}`,
  'Content-Type': 'application/json',
};

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Solid RGB PNG (w×h). */
function solidPng(w, h, r, g, b) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function curl(args) {
  const r = spawnSync('curl', ['-s', '-w', '\n%{http_code}', ...args], {
    encoding: 'utf8',
    maxBuffer: 8_000_000,
  });
  if (r.status !== 0) throw new Error(`curl failed: ${r.stderr || r.error}`);
  const lines = r.stdout.trimEnd().split('\n');
  const code = Number(lines.pop());
  const body = lines.join('\n');
  return { code, body };
}

function jar(path) {
  return ['-c', path, '-b', path];
}

const results = [];
function step(name, fn) {
  try {
    const out = fn();
    results.push({ name, ok: true, out });
    const s = typeof out === 'string' ? out : JSON.stringify(out);
    console.log('PASS', name, s.slice(0, 220));
  } catch (e) {
    results.push({ name, ok: false, error: String(e.message || e) });
    console.error('FAIL', name, e.message || e);
    process.exitCode = 1;
  }
}

async function upsertAccount({ email, password, role, batch, name }) {
  const hash = await bcrypt.hash(password, 10);
  const found = await fetch(
    `${sbUrl}/rest/v1/alumni_accounts?email=eq.${encodeURIComponent(email)}&select=id`,
    { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
  ).then((r) => r.json());
  const payload = {
    email,
    password_hash: hash,
    full_name: name,
    role,
    member_status: 'verified',
    batch,
  };
  if (found[0]?.id) {
    await fetch(`${sbUrl}/rest/v1/alumni_accounts?id=eq.${found[0].id}`, {
      method: 'PATCH',
      headers: sbHeaders,
      body: JSON.stringify(payload),
    });
    return found[0].id;
  }
  const ins = await fetch(`${sbUrl}/rest/v1/alumni_accounts`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  }).then((r) => r.json());
  return ins[0].id;
}

const password = 'MultiPic!2026';
const memberEmail = 'sfs-multi-member@example.com';
const otherEmail = 'sfs-multi-other@example.com';
const adminEmail = 'sfs-multi-admin@example.com';

const memberId = await upsertAccount({
  email: memberEmail,
  password,
  role: 'alumni',
  batch: 1999,
  name: 'Multi Member 1999',
});
const otherId = await upsertAccount({
  email: otherEmail,
  password,
  role: 'alumni',
  batch: 2005,
  name: 'Multi Member 2005',
});
const adminId = await upsertAccount({
  email: adminEmail,
  password,
  role: 'admin',
  batch: 1988,
  name: 'Multi Admin',
});

writeFileSync(
  '/tmp/sfs-multi-creds.json',
  JSON.stringify({ memberEmail, otherEmail, adminEmail, password, memberId, otherId, adminId }, null, 2)
);

const pics = {
  navy: '/tmp/sfs-pic-navy.png',
  gold: '/tmp/sfs-pic-gold.png',
  green: '/tmp/sfs-pic-green.png',
  red: '/tmp/sfs-pic-red.png',
  purple: '/tmp/sfs-pic-purple.png',
  teal: '/tmp/sfs-pic-teal.png',
};
writeFileSync(pics.navy, solidPng(240, 180, 10, 30, 80));
writeFileSync(pics.gold, solidPng(240, 180, 200, 160, 40));
writeFileSync(pics.green, solidPng(240, 180, 30, 140, 70));
writeFileSync(pics.red, solidPng(240, 180, 180, 40, 40));
writeFileSync(pics.purple, solidPng(240, 180, 90, 40, 140));
writeFileSync(pics.teal, solidPng(240, 180, 20, 140, 150));

const ids = {};

step('unauth browse 401', () => {
  const { code, body } = curl([`${BASE}/api/memories`]);
  if (code !== 401) throw new Error(`${code} ${body}`);
  return code;
});

step('member login', () => {
  const { body } = curl([
    ...jar('/tmp/sfs-multi-member.jar'),
    '-X',
    'POST',
    `${BASE}/api/auth/login`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ email: memberEmail, password }),
  ]);
  if (!JSON.parse(body).ok) throw new Error(body);
  return 'ok';
});

step('other-batch member login', () => {
  const { body } = curl([
    ...jar('/tmp/sfs-multi-other.jar'),
    '-X',
    'POST',
    `${BASE}/api/auth/login`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ email: otherEmail, password }),
  ]);
  if (!JSON.parse(body).ok) throw new Error(body);
  return 'ok';
});

step('admin login', () => {
  const { body } = curl([
    ...jar('/tmp/sfs-multi-admin.jar'),
    '-X',
    'POST',
    `${BASE}/api/auth/login`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ email: adminEmail, password }),
  ]);
  if (!JSON.parse(body).ok) throw new Error(body);
  return 'ok';
});

function postMemory(jarPath, { title, batch, file, consent = 'true' }) {
  const args = [
    ...jar(jarPath),
    '-X',
    'POST',
    `${BASE}/api/memories`,
    '-F',
    `title=${title}`,
    '-F',
    `batch_year=${batch}`,
    '-F',
    `image=@${file};type=image/png`,
  ];
  if (consent != null) args.push('-F', `consent=${consent}`);
  return curl(args);
}

step('reject: no consent', () => {
  const { code, body } = postMemory('/tmp/sfs-multi-member.jar', {
    title: 'No consent shot',
    batch: '1999',
    file: pics.navy,
    consent: null,
  });
  const j = JSON.parse(body);
  if (code !== 400 || !/consent/i.test(j.error || '')) throw new Error(`${code} ${body}`);
  return j.error;
});

step('upload 3× own batch (1999)', () => {
  const titles = [
    ['own-navy', pics.navy],
    ['own-gold', pics.gold],
    ['own-green', pics.green],
  ];
  for (const [title, file] of titles) {
    const { code, body } = postMemory('/tmp/sfs-multi-member.jar', {
      title,
      batch: '1999',
      file,
    });
    const j = JSON.parse(body);
    if (code !== 201 || !j.memory?.id) throw new Error(body);
    if (!String(j.memory.storage_path).startsWith('batch/1999/')) throw new Error(j.memory.storage_path);
    if (j.memory.status !== 'pending') throw new Error('not pending');
    ids[title] = j.memory.id;
  }
  return Object.keys(ids).filter((k) => k.startsWith('own'));
});

step('upload 2× general', () => {
  for (const [title, file] of [
    ['general-red', pics.red],
    ['general-purple', pics.purple],
  ]) {
    const { code, body } = postMemory('/tmp/sfs-multi-member.jar', {
      title,
      batch: 'general',
      file,
    });
    const j = JSON.parse(body);
    if (code !== 201 || !j.ok) throw new Error(body);
    if (!String(j.memory.storage_path).startsWith('general/')) throw new Error(j.memory.storage_path);
    ids[title] = j.memory.id;
  }
  return ['general-red', 'general-purple'];
});

step('other member uploads batch 2005', () => {
  const { code, body } = postMemory('/tmp/sfs-multi-other.jar', {
    title: 'other-teal',
    batch: '2005',
    file: pics.teal,
  });
  const j = JSON.parse(body);
  if (code !== 201 || !j.ok) throw new Error(body);
  ids['other-teal'] = j.memory.id;
  return j.memory.id;
});

step('pending never in browse (member)', () => {
  const { body } = curl([...jar('/tmp/sfs-multi-member.jar'), `${BASE}/api/memories`]);
  const j = JSON.parse(body);
  const allIds = [...(j.ownBatch || []), ...(j.allSfs || [])].map((r) => r.id);
  for (const id of Object.values(ids)) {
    if (allIds.includes(id)) throw new Error(`pending leaked ${id}`);
  }
  return { own: j.ownBatch.length, all: j.allSfs.length };
});

step('mine shows all pending for member', () => {
  const { body } = curl([...jar('/tmp/sfs-multi-member.jar'), `${BASE}/api/memories/mine`]);
  const j = JSON.parse(body);
  const mine = j.submissions || [];
  const mineIds = new Set(mine.map((s) => s.id));
  for (const key of ['own-navy', 'own-gold', 'own-green', 'general-red', 'general-purple']) {
    if (!mineIds.has(ids[key])) throw new Error(`missing ${key}`);
    if (mine.find((s) => s.id === ids[key])?.status !== 'pending') throw new Error(`${key} not pending`);
  }
  if (mineIds.has(ids['other-teal'])) throw new Error('saw other member submission');
  return mine.length;
});

step('admin queue lists pending (>=6)', () => {
  const { code, body } = curl([
    ...jar('/tmp/sfs-multi-admin.jar'),
    `${BASE}/api/admin/memories?status=pending`,
  ]);
  if (code !== 200) throw new Error(`${code} ${body}`);
  const j = JSON.parse(body);
  const q = new Set((j.memories || []).map((m) => m.id));
  for (const id of Object.values(ids)) {
    if (!q.has(id)) throw new Error(`admin missing ${id}`);
  }
  return j.memories.length;
});

step('member cannot approve', () => {
  const { code, body } = curl([
    ...jar('/tmp/sfs-multi-member.jar'),
    '-X',
    'PATCH',
    `${BASE}/api/admin/memories/${ids['own-navy']}`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ status: 'published' }),
  ]);
  if (code !== 403) throw new Error(`${code} ${body}`);
  return code;
});

step('admin rejects one (own-green)', () => {
  const { code, body } = curl([
    ...jar('/tmp/sfs-multi-admin.jar'),
    '-X',
    'PATCH',
    `${BASE}/api/admin/memories/${ids['own-green']}`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ status: 'rejected', review_note: 'blurry test reject' }),
  ]);
  if (code !== 200 || !JSON.parse(body).ok) throw new Error(`${code} ${body}`);
  return 'ok';
});

step('admin publishes the rest', () => {
  for (const key of ['own-navy', 'own-gold', 'general-red', 'general-purple', 'other-teal']) {
    const { code, body } = curl([
      ...jar('/tmp/sfs-multi-admin.jar'),
      '-X',
      'PATCH',
      `${BASE}/api/admin/memories/${ids[key]}`,
      '-H',
      'Content-Type: application/json',
      '-d',
      JSON.stringify({ status: 'published' }),
    ]);
    if (code !== 200 || !JSON.parse(body).ok) throw new Error(`${key} ${code} ${body}`);
  }
  return 5;
});

step('double-approve → 409', () => {
  const { code } = curl([
    ...jar('/tmp/sfs-multi-admin.jar'),
    '-X',
    'PATCH',
    `${BASE}/api/admin/memories/${ids['own-navy']}`,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ status: 'published' }),
  ]);
  if (code !== 409) throw new Error(`expected 409 got ${code}`);
  return code;
});

step('partition B for 1999 member', () => {
  const { body } = curl([...jar('/tmp/sfs-multi-member.jar'), `${BASE}/api/memories`]);
  const j = JSON.parse(body);
  const own = j.ownBatch.map((r) => r.id);
  const all = j.allSfs.map((r) => r.id);
  if (!own.includes(ids['own-navy']) || !own.includes(ids['own-gold'])) throw new Error('missing own');
  if (own.includes(ids['own-green'])) throw new Error('rejected in own');
  if (own.includes(ids['general-red']) || own.includes(ids['other-teal'])) throw new Error('wrong in own');
  if (!all.includes(ids['general-red']) || !all.includes(ids['general-purple'])) throw new Error('missing general');
  if (!all.includes(ids['other-teal'])) throw new Error('missing other batch');
  if (all.includes(ids['own-navy'])) throw new Error('own duplicated in allSfs');
  const dup = own.filter((id) => all.includes(id));
  if (dup.length) throw new Error(`dups ${dup}`);
  return { own: own.length, all: all.length };
});

step('partition B for 2005 member', () => {
  const { body } = curl([...jar('/tmp/sfs-multi-other.jar'), `${BASE}/api/memories`]);
  const j = JSON.parse(body);
  const own = j.ownBatch.map((r) => r.id);
  const all = j.allSfs.map((r) => r.id);
  if (!own.includes(ids['other-teal'])) throw new Error('2005 not in own');
  if (own.includes(ids['own-navy'])) throw new Error('1999 in 2005 own');
  if (!all.includes(ids['own-navy']) || !all.includes(ids['general-red'])) throw new Error('missing in all');
  if (all.includes(ids['other-teal'])) throw new Error('own dup in all');
  return { own: own.length, all: all.length };
});

step('rejected stays out of browse + note in mine', () => {
  const browse = JSON.parse(
    curl([...jar('/tmp/sfs-multi-member.jar'), `${BASE}/api/memories`]).body
  );
  const idsBrowse = [...browse.ownBatch, ...browse.allSfs].map((r) => r.id);
  if (idsBrowse.includes(ids['own-green'])) throw new Error('rejected visible');
  const mine = JSON.parse(
    curl([...jar('/tmp/sfs-multi-member.jar'), `${BASE}/api/memories/mine`]).body
  );
  const row = mine.submissions.find((s) => s.id === ids['own-green']);
  if (!row || row.status !== 'rejected') throw new Error(JSON.stringify(row));
  if (!/blurry/i.test(row.review_note || '')) throw new Error(row.review_note);
  return row.review_note;
});

step('published images downloadable', () => {
  const { body } = curl([...jar('/tmp/sfs-multi-member.jar'), `${BASE}/api/memories`]);
  const j = JSON.parse(body);
  const items = [...j.ownBatch, ...j.allSfs];
  if (items.length < 5) throw new Error(`expected >=5 got ${items.length}`);
  const sizes = [];
  for (const item of items) {
    if (!item.image_url) throw new Error(`no url ${item.title}`);
    const r = spawnSync(
      'curl',
      ['-s', '-o', '/tmp/sfs-fetch-one.bin', '-w', '%{http_code} %{size_download}', item.image_url],
      { encoding: 'utf8' }
    );
    const [code, size] = r.stdout.trim().split(' ');
    if (code !== '200') throw new Error(`${item.title} http ${code}`);
    if (Number(size) < 100) throw new Error(`${item.title} too small ${size}`);
    sizes.push({ title: item.title, bytes: Number(size) });
  }
  return sizes;
});

step('nav labels', () => {
  const { body } = curl([...jar('/tmp/sfs-multi-member.jar'), `${BASE}/memories`]);
  for (const label of ['Home', 'People', 'Events', 'Memories', 'My submissions']) {
    if (!body.includes(label)) throw new Error(`missing ${label}`);
  }
  return 'ok';
});

step('submissions page route', () => {
  const { code, body } = curl([...jar('/tmp/sfs-multi-member.jar'), `${BASE}/submissions`]);
  if (code !== 200) throw new Error(`submissions page ${code}`);
  if (!body.includes('My submissions')) throw new Error('missing page title');
  if (!body.includes('YOUR MEMORY SUBMISSIONS')) throw new Error('missing eyebrow');
  return 'ok';
});

writeFileSync(
  '/tmp/sfs-multi-ids.json',
  JSON.stringify({ ids, memberEmail, password, KEEP }, null, 2)
);

const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  console.log('Failures:', failed.map((f) => f.name).join(', '));
}

if (!KEEP) {
  console.log('Cleanup: deleting scenario memories + accounts (KEEP=1 to retain)...');
  const idList = Object.values(ids);
  for (const id of idList) {
    const row = await fetch(`${sbUrl}/rest/v1/alumni_memories?id=eq.${id}&select=storage_path`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    }).then((r) => r.json());
    const path = row[0]?.storage_path;
    if (path) {
      await fetch(`${sbUrl}/storage/v1/object/alumni-memories`, {
        method: 'DELETE',
        headers: { ...sbHeaders },
        body: JSON.stringify([path]),
      });
    }
    await fetch(`${sbUrl}/rest/v1/alumni_memories?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, Prefer: 'return=minimal' },
    });
  }
  // also remove leftover campus sample from earlier if any from pictest
  for (const email of [memberEmail, otherEmail, adminEmail, 'sfs-pictest@example.com']) {
    await fetch(`${sbUrl}/rest/v1/alumni_accounts?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, Prefer: 'return=minimal' },
    });
  }
  console.log('Cleanup done.');
} else {
  console.log('KEEP=1 — data left for browser inspection.');
}
