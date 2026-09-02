-- ============================================================================
-- FIX — "new row violates row-level security policy for table projects"
-- (Postgres error 42501 on the Create Project form)
--
-- CAUSE: RLS is enabled on public.projects but no policy allows your INSERT
--        (policies from db/projects_table.sql were not applied, or the table
--        was created from the dashboard with RLS on and no policies).
--
-- RUN: Supabase Dashboard → SQL Editor → paste → Run.
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

alter table public.projects enable row level security;

-- Clear any missing/renamed/over-restrictive policies, then recreate the
-- exact set the app expects.
drop policy if exists "projects_select_public"        on public.projects;
drop policy if exists "projects_insert_authenticated" on public.projects;
drop policy if exists "projects_update_authenticated" on public.projects;
drop policy if exists "projects_update_lead"          on public.projects;

-- Anyone (including logged-out visitors) can READ projects.
create policy "projects_select_public"
  on public.projects
  for select
  using (true);

-- Signed-in users can CREATE projects (the Create Project form).
-- NOTE: "to authenticated" = your browser session must be signed in
-- (the form page already requires it). If it still fails after this,
-- check in the browser console:  await sbClient.auth.getSession()
-- and confirm session.user exists. Debug-only looser variant:
--   for insert to public with check (true)
create policy "projects_insert_authenticated"
  on public.projects
  for insert
  to authenticated
  with check (true);

-- Signed-in users can UPDATE (documents sync after upload, stage/progress).
create policy "projects_update_authenticated"
  on public.projects
  for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================================
-- VERIFY (optional) — should list exactly the three policies above:
--   select policyname, cmd, roles from pg_policies where tablename = 'projects';
-- And confirm your browser session is authenticated:
--   (browser console)  (await sbClient.auth.getSession()).data.session?.user
-- ============================================================================