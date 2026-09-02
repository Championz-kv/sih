-- ============================================================================
-- SolveSamaj — problems ownership via submitted_by
-- Run ONCE: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================
-- Goal: problems.submitted_by links each row to the auth account that filed
-- it. With these rules, an account can only ever read ITS OWN problems.
-- Demo/dummy rows (submitted_by NULL or another account's id) are invisible
-- through the API, so "My Problems" never shows them.

-- 1) Ensure the ownership column exists as a UUID pointing at auth.users
--    (no-op if it already exists — verify its type with:
--     select data_type from information_schema.columns
--     where table_schema='public' and table_name='problems'
--       and column_name='submitted_by';
--     It must be 'uuid'.)
alter table public.problems
  add column if not exists submitted_by uuid references auth.users (id) on delete set null;

-- 2) Stamp new rows with the inserting account automatically
alter table public.problems
  alter column submitted_by set default auth.uid();

-- 3) Fast "my problems" lookups
create index if not exists problems_submitted_by_idx
  on public.problems (submitted_by);

-- 4) Add the foreign key if it is missing (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'problems_submitted_by_fkey'
      and conrelid = 'public.problems'::regclass
  ) then
    alter table public.problems
      add constraint problems_submitted_by_fkey
      foreign key (submitted_by) references auth.users (id) on delete set null;
  end if;
end $$;

-- 5) Row Level Security — an account can only see its own problems
alter table public.problems enable row level security;

drop policy if exists "problems_select_own" on public.problems;
create policy "problems_select_own"
  on public.problems for select
  using (submitted_by = auth.uid());

drop policy if exists "problems_insert_own" on public.problems;
create policy "problems_insert_own"
  on public.problems for insert
  with check (submitted_by = auth.uid());

drop policy if exists "problems_update_own" on public.problems;
create policy "problems_update_own"
  on public.problems for update
  using (submitted_by = auth.uid())
  with check (submitted_by = auth.uid());

-- 6) OPTIONAL — allow public browsing of ALL problems (for explore.html,
--    dashboard.html etc. if you later wire public pages to the database).
--    Uncomment only if you want that behaviour:
-- drop policy if exists "problems_read_public" on public.problems;
-- create policy "problems_read_public"
--   on public.problems for select
--   using (true);