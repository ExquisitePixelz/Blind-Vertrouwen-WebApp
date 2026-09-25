-- Phase 5: session notes (ARCHITECTURE.md 1.4 and 4).
--
-- * sessions: campaign content with audience 'dm'. Only the DM reads or
--   writes them: the "dm all" policy is the only policy.
-- * Numbers are unique per campaign among live sessions; a deleted session
--   does not block its number.
-- * session_attendance: one row per character present. A checkbox, not
--   content: unticking deletes the row (no soft delete, no version).
-- Attendance is in this migration too, so the owner applies Phase 5 with one
-- `db push`.

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id),
  owner_id uuid default auth.uid() references auth.users (id) on delete set null,
  audience text not null default 'dm' check (audience in ('members', 'owner', 'dm')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  number integer not null check (number >= 1),
  title text not null default '',
  notes text not null default '',
  -- The group plays in the Netherlands: "today" there, not in UTC.
  played_on date not null default (now() at time zone 'Europe/Amsterdam')::date
);

create unique index sessions_number_per_campaign
  on public.sessions (campaign_id, number)
  where deleted_at is null;

create trigger content_stamp before insert or update on public.sessions
  for each row execute function private.content_stamp();

create table public.session_attendance (
  session_id uuid not null references public.sessions (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, character_id)
);
create index session_attendance_character_idx on public.session_attendance (character_id);

alter table public.sessions enable row level security;
alter table public.session_attendance enable row level security;
revoke all on public.sessions, public.session_attendance from anon;

create policy "dm all" on public.sessions for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "dm all" on public.session_attendance for all to authenticated
  using (private.is_dm()) with check (private.is_dm());

-- New session: the given number (the first session's starting number), or
-- the highest live number + 1 (not count + 1). Runs with the caller's rights,
-- so only the DM can create one.
create function public.create_session(p_campaign_id uuid, p_number integer default null)
returns public.sessions
language plpgsql set search_path = ''
as $$
declare
  v_session public.sessions;
begin
  insert into public.sessions (campaign_id, number)
  values (
    p_campaign_id,
    coalesce(
      p_number,
      (select max(number) + 1 from public.sessions where campaign_id = p_campaign_id and deleted_at is null),
      1
    )
  )
  returning * into v_session;
  return v_session;
end;
$$;

revoke all on function public.create_session(uuid, integer) from public, anon;
grant execute on function public.create_session(uuid, integer) to authenticated;
