-- ============================================================================
-- SolveSamaj — Create Project form → `projects` table (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- One column per Create Project form entry, plus the requested `project_id`
-- and `problem_id`. `problem_id` is a foreign key to problems.case_no.
--
-- Form entry                    → column
-- ------------------------------------------------------------------
-- Case ID * (e.g. 1042)         → problem_id        (FK → problems.case_no)
-- Problem title *               → problem_title
-- Project short summary *       → summary
-- Lead organisation (auto)      → lead_organisation
-- Date of starting the project* → start_date
-- Documents (multi-file)        → documents         (jsonb: [{name, size}])
--
-- Run in: Supabase Dashboard → SQL Editor.
-- ============================================================================

create table public.projects (
  /* ---- identity ---- */
  project_id        uuid primary key default gen_random_uuid(),
  -- human-readable display code used by the UI (the demo form generates
  -- 'PRJ-03xx'); nullable here so the backend can assign it on approval
  project_code      text unique,

  /* ---- form: Case ID * → linked problem ----
     IMPORTANT: an FK target must be a PRIMARY KEY or UNIQUE column.
     If problems.case_no is not unique yet, run the helper ALTER below. */
  problem_id        integer not null references public.problems (case_no),

  /* ---- form: Problem title * ---- */
  problem_title     text not null,

  /* ---- form: Project short summary * ---- */
  summary           text not null,

  /* ---- form: Lead organisation (auto-detected from the logged-in
     organization account, so it is always present on insert) ---- */
  lead_organisation text not null,

  /* ---- form: Date of starting the project * (pre-filled with today) ---- */
  start_date        date not null,

  /* ---- form: Documents (multiple files) ----
     Each attachment is stored as {"name", "size_kb", "path", "url"} —
     "path" is the object's location in the project_docs bucket
     (<project_id>/<file name>); "url" is its public URL (only usable if
     the bucket is public). The files themselves live in the bucket.
     Normalized alternative: a project_documents child table — use that
     instead if you later need per-document metadata/permissions. */
  documents         jsonb not null default '[]'::jsonb,

  /* ---- platform defaults (not form fields — the UI expects them) ---- */
  stage             text not null default 'Proposed',
  progress          integer not null default 0 check (progress between 0 and 100),

  created_at        timestamptz not null default now()
);

/* Fast lookups of all projects linked to one case, and by display code. */
create index projects_problem_id_idx on public.projects (problem_id);
create index projects_lead_organisation_idx on public.projects (lead_organisation);

-- ============================================================================
-- HELPER — run ONLY if problems.case_no is not already PK/UNIQUE.
-- (PostgreSQL refuses an FK reference to a non-unique column.)
-- ============================================================================
-- alter table public.problems add constraint problems_case_no_key unique (case_no);
-- If case_no stores text codes like 'SS/JH/2026/1042' instead of numbers,
-- change problem_id's type to match:  problem_id text not null ...

-- ============================================================================
-- RECOMMENDED — Row Level Security (a table without RLS is readable/writable
-- through the anon key). Adjust once the organisations table exists.
-- ============================================================================
alter table public.projects enable row level security;

-- Anyone can browse projects (public directory / analytics views).
create policy "projects_select_public"
  on public.projects for select
  using (true);

-- Signed-in users can create projects; tighten to org accounts later, e.g.
--   with check (exists (select 1 from public.profiles p
--                      where p.id = auth.uid() and p.role = 'org_member'));
create policy "projects_insert_authenticated"
  on public.projects for insert
  to authenticated
  with check (true);

-- The lead organisation can keep its project up to date (stage/progress).
-- Permissive for now (any signed-in user) so the form's document-list
-- update always works while lead_organisation is still the demo value
-- ('MMMUT') rather than a real FK. Tighten once organizations exist, e.g.:
--   using (lead_organisation = (select full_name from public.profiles where id = auth.uid()))
create policy "projects_update_authenticated"
  on public.projects for update
  to authenticated
  using (true)
  with check (true);
