-- The start of a session's notes, for the Sessions list (ARCHITECTURE.md 1.11
-- B4). The list only shows the first line, so it reads these 500 characters
-- instead of every session's full notes. The database keeps it in step with
-- `notes` on every save; nobody can write it. It is a column of `sessions`,
-- so the same row-level security applies: only the DM can read it.
alter table public.sessions
  add column notes_start text generated always as (left(notes, 500)) stored;
