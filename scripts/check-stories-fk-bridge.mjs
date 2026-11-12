/**
 * Self-check: bridge alumni_accounts id into legacy users so alumni_stories insert works.
 * Run: node --env-file=.env.local scripts/check-stories-fk-bridge.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensure(account) {
  const existing = await admin.from('users').select('id').eq('id', account.id).maybeSingle();
  if (existing.data?.id) return;
  const email = `legacy-bridge-${account.id.replace(/-/g, '')}@sfs.internal`;
  const { error: authErr } = await admin.auth.admin.createUser({
    id: account.id,
    email,
    email_confirm: true,
    user_metadata: { bridge: 'alumni_stories_fk' },
  });
  if (authErr && !/already|registered|exists/i.test(authErr.message)) throw authErr;
  const { error: userErr } = await admin.from('users').upsert(
    {
      id: account.id,
      email,
      full_name: account.full_name || 'Alumni',
      role: 'alumni',
      member_status: 'verified',
    },
    { onConflict: 'id' }
  );
  if (userErr) throw userErr;
}

const { data: account, error: accErr } = await admin
  .from('alumni_accounts')
  .select('id,full_name')
  .limit(1)
  .single();
if (accErr || !account) throw accErr || new Error('No alumni_accounts row');

await ensure(account);

const { data, error } = await admin
  .from('alumni_stories')
  .insert({
    author_id: account.id,
    title: 'FK bridge check',
    body: 'Temporary check row.',
    status: 'pending',
  })
  .select('id')
  .single();

if (error) {
  console.error('FAIL', error.message, error.details);
  process.exit(1);
}

await admin.from('alumni_stories').delete().eq('id', data.id);
console.log('ok: alumni_stories insert with alumni_accounts id');
