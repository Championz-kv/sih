-- ============================================================================
-- SolveSamaj — Extend `projects` with workspace columns + document storage
-- ----------------------------------------------------------------------------
-- Run AFTER db/projects_table.sql in Supabase Dashboard → SQL Editor.
-- Safe to re-run: every statement is guarded (IF NOT EXISTS / drop-if-exists).
--
-- Adds to `projects` (all workspace data the UI needs, no separate tables):
--   participating_organisation jsonb   ["Org A", "Org B"]          (collaborators)
--   updates                    jsonb   [{"heading","content","time"}, ...]
--   discussions                jsonb   [{"user","content","time"}, ...]
--   milestones                 jsonb   [1, 3, 4]                   (completed
--                                      stage numbers of the FIXED 8-step
--                                      project cycle: 1 Proposed … 8 Completed)
--   tasks                      jsonb   [["name","organisation","status","due"], ...]
--                                      status: Not started | In progress | Completed
--                                      due: "12 Aug 2026" or "—"
--
-- `stage` and `documents` stay REMOVED:
--   stage     → derived from milestones (first uncompleted stage)
--   documents → files in the `project_docs` storage bucket, metadata in the
--               `project_documents` table created below.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Workspace columns (no-op when db/projects_table.sql already created them)
-- ----------------------------------------------------------------------------
alter table public.projects add column if not exists participating_organisation jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists updates jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists discussions jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists milestones jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists tasks jsonb not null default '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- 2. project_documents — metadata rows for files stored in the project_docs
--    bucket (one folder per project_id: <project_id>/<filename>).
--    db-project.html loads them with:
--      sbClient.from('projects').select('*, project_documents(*)')
-- ----------------------------------------------------------------------------
create table if not exists public.project_documents (
  doc_id      uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (project_id) on delete cascade,
  name        text not null,            -- display name (original file name)
  size_kb     integer,                  -- size in KB (rounded)
  path        text not null,            -- object path INSIDE the bucket
  url         text,                     -- public URL from storage.getPublicUrl
  uploaded_at timestamptz not null default now()
);

create index if not exists project_documents_project_id_idx on public.project_documents (project_id);

alter table public.project_documents enable row level security;

drop policy if exists "project_documents_select_public" on public.project_documents;
create policy "project_documents_select_public"
  on public.project_documents for select
  using (true);

drop policy if exists "project_documents_insert_authenticated" on public.project_documents;
create policy "project_documents_insert_authenticated"
  on public.project_documents for insert
  to authenticated
  with check (true);

drop policy if exists "project_documents_delete_authenticated" on public.project_documents;
create policy "project_documents_delete_authenticated"
  on public.project_documents for delete
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 3. project_docs storage bucket + its access policies
--    (public read — doc URLs are opened straight from the workspace)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project_docs', 'project_docs', true)
on conflict (id) do nothing;

drop policy if exists "project_docs_read_public" on storage.objects;
create policy "project_docs_read_public"
  on storage.objects for select
  using (bucket_id = 'project_docs');

drop policy if exists "project_docs_insert_authenticated" on storage.objects;
create policy "project_docs_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project_docs');

-- ----------------------------------------------------------------------------
-- 4. Keep bucket + metadata in sync: deleting a project_documents row also
--    deletes the file object from the project_docs bucket (and deleting a
--    project cascades to its metadata rows, which then cleans the bucket).
-- ----------------------------------------------------------------------------
create or replace function public.delete_project_doc_object()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from storage.objects where bucket_id = 'project_docs' and name = old.path;
  return old;
end;
$$;

drop trigger if exists project_documents_cleanup on public.project_documents;
create trigger project_documents_cleanup
  after delete on public.project_documents
  for each row execute function public.delete_project_doc_object();
