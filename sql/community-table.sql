-- ============================================================================
-- SolveSamaj — Community discussion table
-- Run ONCE: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================
-- Table public.community stores every comment on a problem:
--   comment_id  — primary key (auto-generated uuid)
--   problem_id  — which problem the comment belongs to (FK → problems.id)
--   user_id     — who wrote it (FK → profiles.id, the logged-in account)
--   comment     — the comment text
--   supports    — how many people supported/upvoted the comment
--   created_at  — when it was posted

-- 1) Create the table with foreign keys to problems and profiles
create table if not exists public.community (
  comment_id  uuid primary key default gen_random_uuid(),
  problem_id  bigint not null references public.problems (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  comment     text not null,
  supports    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 2) Fast lookups of a problem's comment thread
create index if not exists community_problem_id_idx
  on public.community (problem_id);
create index if not exists community_user_id_idx
  on public.community (user_id);

-- 3) Row Level Security
alter table public.community enable row level security;

-- Anyone (even guests) can read the discussion
drop policy if exists "community_select_all" on public.community;
create policy "community_select_all"
  on public.community for select
  using (true);

-- Only signed-in accounts can comment, and only as themselves
drop policy if exists "community_insert_own" on public.community;
create policy "community_insert_own"
  on public.community for insert
  with check (user_id = auth.uid());

-- Signed-in accounts can update ONLY the supports counter (column-level
-- grant below blocks editing the comment text through the API)
drop policy if exists "community_update_supports" on public.community;
create policy "community_update_supports"
  on public.community for update
  to authenticated
  using (true)
  with check (true);

-- Authors can delete their own comments
drop policy if exists "community_delete_own" on public.community;
create policy "community_delete_own"
  on public.community for delete
  using (user_id = auth.uid());

-- 4) Column-level guard: the API can only ever UPDATE the supports column
revoke update on table public.community from anon, authenticated;
grant update (supports) on table public.community to authenticated;

-- ============================================================================
-- 5) OPTIONAL seed — create one real problem row so you can test comments.
--    Uncomment, run, note the returned id, then open:
--    problem.html?id=<returned id>   (the Community panel will use it)
--    If submitted_by is NOT NULL on your table, add it, e.g.:
--      submitted_by = '<your-auth-user-uuid>'
-- ============================================================================
-- insert into public.problems (title, description, district, block, severity, urgency)
-- values ('Community test case', 'Seed row used to test the community thread.',
--         'Ranchi', 'Ormanjhi', 'high', 'Immediate')
-- returning id;