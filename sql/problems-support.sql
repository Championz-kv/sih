-- ============================================================================
-- SolveSamaj — per-profile supported problems (Support button toggle)
-- Run ONCE: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================
-- The Support button on problem.html is now a TWO-WAY toggle:
--   • NOT yet backed  → click:  problems.support += 1,
--                                profiles.cases_supported += 1, and this
--                                problem id is appended to
--                                profiles.supported_problems.
--   • Already backed  → click:  both counters -= 1 (never below 0) and the
--                                id is removed from supported_problems.
-- profiles.supported_problems is the source of truth for "has this account
-- already backed this case?", so a supporter can NEVER double-count — and a
-- second click cleanly unsupports.
--
-- All statements are idempotent; running the block twice is safe.

-- 1) Column on profiles: the list of problem ids this account has backed.
--    problems.id is bigint, so store a bigint array. The JS client sends a
--    plain array which PostgREST maps onto this type directly.
alter table public.profiles
  add column if not exists supported_problems bigint[] not null default '{}';

-- 2) cases_supported counter (no-op if your live table already has it)
alter table public.profiles
  add column if not exists cases_supported integer not null default 0;

-- 3) Fast "which cases did this supporter back" lookups
create index if not exists profiles_supported_problems_idx
  on public.profiles using gin (supported_problems);

-- 4) RLS: a signed-in supporter must be allowed to update a problem row's
--    support counter even when they are not the owner. Postgres grants an
--    update if ANY policy matches, so this coexists with the owner-editing
--    policy (problems-submitted-by.sql). If problems RLS is not enabled on
--    your database this policy is inert — safe either way.
drop policy if exists "problems_update_support_any" on public.problems;
create policy "problems_update_support_any"
  on public.problems for update
  to authenticated
  using (true)
  with check (true);

-- 5) Profiles: each account reads and updates its OWN row. These are the
--    same shapes the profile save flow already uses (org-profile.html /
--    citizen-profile.html), recreated here so the toggle cannot hit a
--    missing-policy wall on a freshly restored database.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================================
-- Verification queries (read-only — run these to confirm the setup):
--   select data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles'
--     and column_name in ('supported_problems', 'cases_supported');
--
--   select polname, cmd from pg_policies
--   where schemaname = 'public'
--     and tablename in ('profiles', 'problems')
--     and polname in ('profiles_select_own', 'profiles_update_own',
--                     'problems_update_support_any');
-- ============================================================================