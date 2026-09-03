-- ============================================================================
-- ONE-SHOT FIX — "The database blocked this save (RLS policy missing)"
-- (Postgres error 42501 on the Create Project form)
--
-- PASTE THIS WHOLE FILE into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run at any time. It also creates or repairs the table itself,
-- so it works no matter how the table was originally made.
--
-- SECURITY NOTE: for this prototype the INSERT/UPDATE policies are
-- intentionally open (`to public`) because the app cannot yet verify
-- organisation membership server-side — this guarantees the form works.
-- The stricter signed-in-only variants are included as comments at the
-- bottom; swap them in before any real deployment.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Table — created only if missing; existing rows are never touched
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  project_id        uuid primary key default gen_random_uuid(),
  project_code      text unique,
  problem_id        text,
  project_title     text not null,
  summary           text not null,
  lead_organisation text not null,
  start_date        date not null,
  documents         jsonb not null default '[]'::jsonb,
  stage             text not null default 'Proposed',
  progress          integer not null default 0 check (progress between 0 and 100),
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) Repairs for older versions of the table (legacy names / column types)
-- ---------------------------------------------------------------------------
do $$
begin
  -- legacy column rename: problem_title → project_title
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects' and column_name = 'problem_title')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects' and column_name = 'project_title') then
    alter table public.projects rename column problem_title to project_title;
  end if;

  -- legacy problem_id type: integer → text (Case ID is free text now)
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects' and column_name = 'problem_id'
               and data_type <> 'text') then
    begin
      alter table public.projects alter column problem_id type text using problem_id::text;
    exception when others then
      raise notice 'problem_id type change skipped (%) — problems.case_no must be text + unique', sqlerrm;
    end;
  end if;

  -- make sure every column the form needs exists
  alter table public.projects add column if not exists problem_id        text;
  alter table public.projects add column if not exists project_title     text not null default '';
  alter table public.projects add column if not exists summary           text not null default '';
  alter table public.projects add column if not exists lead_organisation text not null default '';
  alter table public.projects add column if not exists start_date        date;
  alter table public.projects add column if not exists project_code      text;
  alter table public.projects add column if not exists documents         jsonb not null default '[]'::jsonb;
  alter table public.projects add column if not exists stage             text not null default 'Proposed';
  alter table public.projects add column if not exists progress          integer not null default 0;
  alter table public.projects add column if not exists created_at        timestamptz not null default now();
end $$;

-- ---------------------------------------------------------------------------
-- 3) Link to problems.case_no (FK added only if it can be; never aborts)
-- ---------------------------------------------------------------------------
do $$
begin
  -- an FK target must be UNIQUE — add the constraint if problems has none
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'problems')
     and not exists (
        select 1 from pg_constraint c
        join pg_class t      on t.oid = c.conrelid
        join pg_attribute a  on a.attrelid = t.oid and a.attname = 'case_no'
                            and a.attnum = any (c.conkey)
        where t.relname = 'problems' and c.contype in ('p', 'u')) then
    begin
      alter table public.problems add constraint problems_case_no_key unique (case_no);
    exception when others then
      raise notice 'case_no unique constraint skipped (%).', sqlerrm;
    end;
  end if;

  -- the foreign key itself
  if not exists (select 1 from pg_constraint
                 where conname = 'projects_problem_id_fkey'
                   and conrelid = 'public.projects'::regclass) then
    begin
      alter table public.projects
        add constraint projects_problem_id_fkey
        foreign key (problem_id) references public.problems (case_no);
    exception when others then
      raise notice 'FK skipped (%). Ensure problems.case_no is TEXT + UNIQUE and problem_id is text.', sqlerrm;
    end;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Row Level Security — recreated fresh so no stale policy can block you
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

drop policy if exists "projects_select_public"        on public.projects;
drop policy if exists "projects_insert_any"           on public.projects;
drop policy if exists "projects_insert_authenticated" on public.projects;
drop policy if exists "projects_update_any"           on public.projects;
drop policy if exists "projects_update_authenticated" on public.projects;
drop policy if exists "projects_update_lead"          on public.projects;

-- READ: anyone (including logged-out visitors).
create policy "projects_select_public"
  on public.projects
  for select
  using (true);

-- CREATE: open for the prototype — works whether or not the session is
-- authenticated, which is what removes the 42501 error for good.
create policy "projects_insert_any"
  on public.projects
  for insert
  to public
  with check (true);

-- UPDATE: open for the prototype (document-list sync after upload).
create policy "projects_update_any"
  on public.projects
  for update
  to public
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- STRICTER ALTERNATIVES — before any real deployment, drop the two *_any
-- policies above and use these instead (requires a signed-in session):
--   create policy "projects_insert_authenticated"
--     on public.projects for insert to authenticated with check (true);
--   create policy "projects_update_authenticated"
--     on public.projects for update to authenticated using (true) with check (true);

-- ============================================================================
-- VERIFY — re-run any time; should list SELECT / INSERT / UPDATE policies:
--   select policyname, cmd, roles from pg_policies where tablename = 'projects';
-- Then go back to the Create Project form and click "Add project" again.
-- ============================================================================