# SFS Alumni Portal — integration status

## Supabase project
- Project: sfs-alumni-portal
- Project ref: wbsrtwfhcczfbstinenl
- Region: Mumbai (ap-south-1)
- Quoted recurring project cost at creation: $0/month
- Database tables created: public.users, public.alumni_events, public.alumni_stories, public.alumni_memories
- Row-level security is enabled on all four tables.
- Membership defaults to pending; alumni directory RPC only returns safe profile fields and requires verified membership.
- Auth trigger creates a pending public.users profile from Supabase Auth metadata, including when email confirmation is enabled.
- Security advisor review performed. Remaining warnings include authenticated-only SECURITY DEFINER helpers (used by RLS policies / the intended directory RPC), RLS initplan efficiency, and overlapping admin CRUD policies. Recheck after end-to-end tests.

## Vercel status
The connected Vercel account/team sfs currently lists no projects, and the expected project name is not visible through the connection. No deployment or production change has been made. The Supabase URL and publishable key must be configured as Vercel environment variables after the correct Vercel project is accessible.

## Important incomplete integration items
- The uploaded source references pre_registrations, find_pre_registration, and registrations in the existing reunion registration flow. Their authoritative schema/RPC definitions were not included, so they have not been guessed or created. The existing registration flow needs a separate schema review before it can be declared fully connected.
- The first verified admin account still needs to be provisioned through a trusted administrative process after the committee identity is confirmed.
- Configure Supabase email confirmation and redirect URLs for the eventual Vercel preview and production domains.
- Story and memory submission/moderation UI and full admin CRUD are not complete; current portal routes include read experiences and membership approval UI.
- Do not deploy to production until a preview build, auth/signup test, RLS tests for anonymous/pending/verified/admin users, and registration-flow tests pass.

## Local validation
npm ci timed out in this environment. npm run type-check could not complete because the local TypeScript dependency installation is incomplete. Run npm ci, npm run type-check, and npm run build in a connected development environment before deployment.

## Auth model (updated)
- Alumni signup/login is **table-based** (`public.alumni_accounts` + httpOnly session cookie).
- No per-alumnus Supabase Auth users; confirm-email is not used for alumni.
- Required server env: `AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.
- Apply migration `supabase/migrations/20261025_alumni_accounts.sql` in the SQL Editor.
- First admin (after signup):
  `update public.alumni_accounts set role='admin', member_status='verified' where email='YOUR_EMAIL';`
