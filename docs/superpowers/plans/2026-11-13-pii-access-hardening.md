# PII Access Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock PII and roster tables to service_role only for API clients, drop legacy Auth policies, and document Supabase org checklist.

**Architecture:** One idempotent SQL migration reaffirms RLS + REVOKE/GRANT on sensitive tables and drops leftover `authenticated` policies. App stays on server-side service role. Org dashboard access remains a manual operator checklist.

**Tech Stack:** Postgres / Supabase RLS, Node assert self-check, Next.js env docs

**Spec:** `docs/superpowers/specs/2026-11-13-pii-access-hardening-design.md`

## Global Constraints

- Do not grant `anon`/`authenticated` SELECT on PII or `member_roster`.
- Do not remove `committee_members` public read.
- Do not encrypt columns or delete `public.users`.
- Mirror migration in `supabase/migrations/` and `migrations/01_schema/`.

## Review Focus

- Migration must not break admin import/clear roster (service_role).
- Legacy policy names must match `20261025_sfs_alumni_portal.sql` exactly.
- `push_subscriptions` / `event_broadcasts` must get revoke+grant (current gap).
- `committee_members` must still be selectable by anon after migration.
- Owners still bypass RLS in dashboard — checklist must state that.

---

### Task 1: Hardening migration SQL

**Files:**
- Create: `supabase/migrations/20261113150000_pii_access_hardening.sql`
- Create: `migrations/01_schema/20261113150000_pii_access_hardening.sql` (same body)
- Modify: `migrations/APPLY_ORDER.md` (add item 40)

- [x] **Step 1:** Write migration: for each sensitive table → ENABLE RLS, REVOKE ALL FROM PUBLIC/anon/authenticated, GRANT ALL TO service_role; DROP POLICY IF EXISTS for legacy Auth policies; skip committee_members.
- [x] **Step 2:** Update APPLY_ORDER.md.
- [x] **Step 3:** Static check script asserts required revoke lines exist in the migration file.

### Task 2: Env note + org checklist in spec

**Files:**
- Modify: `.env.example` (clarify service role / anon scope)
- Modify: `docs/superpowers/specs/2026-11-13-pii-access-hardening-design.md` (Status: Approved)

- [x] **Step 1:** Strengthen `.env.example` comments.
- [x] **Step 2:** Mark spec Approved.

### Task 3: Apply + verify

- [ ] **Step 1:** Apply migration to production Supabase (SQL Editor or CLI).
- [ ] **Step 2:** Anon select on `member_roster` / `alumni_accounts` denied; service role still works; committee public read OK.
- [ ] **Step 3:** Remind operator to run org membership checklist.

---
