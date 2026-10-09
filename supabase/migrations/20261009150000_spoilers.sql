-- Spoilers (owner decisions, 2026-10-09, section 1.13): a passage in a
-- backstory, an NPC description or a World entry's description that only some
-- people can read. RLS works on whole rows (3.3), so the passage lives in its
-- own row; the text keeps a marker, [](spoiler:<id>), where it was.
-- * Its author (the player who made it) and the DM read, edit, reveal and
--   delete it. Nobody else, not even a character who knows it, passes it on.
-- * Revealed per character (spoiler_knowers: the players of those characters
--   read it) or to everyone who can see the text it is in.
-- * Others see only that a spoiler is there, never who knows it.
-- * A player who edits a shared text cannot remove someone else's spoiler:
--   a save that drops its marker is refused.

create table public.spoilers (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  parent_kind text not null
    constraint spoilers_parent_kind_valid check (parent_kind in ('character', 'npc', 'world_entry')),
  parent_id uuid not null,
  -- The player who made it; empty once that account is deleted (then the DM).
  author_id uuid references auth.users (id) on delete set null,
  text text not null default ''
    constraint spoilers_text_length check (char_length(text) <= 100000),
  to_everyone boolean not null default false
);
create index spoilers_parent_idx on public.spoilers (parent_kind, parent_id);

create table public.spoiler_knowers (
  spoiler_id uuid not null references public.spoilers (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (spoiler_id, character_id)
);
create index spoiler_knowers_character_idx on public.spoiler_knowers (character_id);

create trigger content_stamp before insert or update on public.spoilers
  for each row execute function private.content_stamp();

-- ============================================================
-- Helpers (security definer: they read past RLS, so the policies below do
-- not call each other in a loop)
-- ============================================================

-- Can the user read the text this spoiler is in?
create function private.spoiler_parent_readable(p_kind text, p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_kind
    when 'character' then exists (
      select 1 from public.characters c
      where c.id = p_id and c.deleted_at is null and private.is_campaign_member(c.campaign_id)
    )
    when 'npc' then private.npc_visible(p_id)
    when 'world_entry' then private.world_entry_visible(p_id)
    else false
  end;
$$;

-- Can the user add a spoiler to this text: their own character's backstory,
-- or an NPC or World entry they can see (the shared wiki, 1.13)?
create function private.spoiler_parent_editable(p_kind text, p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_kind
    when 'character' then exists (
      select 1 from public.characters c
      where c.id = p_id and c.deleted_at is null
        and c.owner_id = (select auth.uid()) and private.is_campaign_member(c.campaign_id)
    )
    when 'npc' then exists (
      select 1 from public.npcs n where n.id = p_id and n.deleted_at is null and private.npc_visible(p_id)
    )
    when 'world_entry' then exists (
      select 1 from public.world_entries e where e.id = p_id and e.deleted_at is null and private.world_entry_visible(p_id)
    )
    else false
  end;
$$;

-- Who reads a spoiler: the DM, its author, the players of the characters it
-- was revealed to, and, once revealed to everyone, whoever reads its text.
create function private.spoiler_readable(p_spoiler_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.spoilers s
    where s.id = p_spoiler_id
      and (
        private.is_dm()
        or s.author_id = (select auth.uid())
        or (s.to_everyone and private.spoiler_parent_readable(s.parent_kind, s.parent_id))
        or exists (
          select 1
          from public.spoiler_knowers k
          join public.characters c on c.id = k.character_id
          where k.spoiler_id = s.id
            and c.owner_id = (select auth.uid())
            and c.deleted_at is null
            and private.is_campaign_member(c.campaign_id)
        )
      )
  );
$$;

-- The spoiler's author, for the policies and the marker guard.
create function private.spoiler_author(p_spoiler_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select author_id from public.spoilers where id = p_spoiler_id;
$$;

-- Does a spoiler with this id exist? (A marker without a row is not guarded.)
create function private.spoiler_exists(p_spoiler_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.spoilers where id = p_spoiler_id);
$$;

revoke all on function
  private.spoiler_parent_readable(text, uuid),
  private.spoiler_parent_editable(text, uuid),
  private.spoiler_readable(uuid),
  private.spoiler_author(uuid),
  private.spoiler_exists(uuid)
from public, anon;
grant execute on function
  private.spoiler_parent_readable(text, uuid),
  private.spoiler_parent_editable(text, uuid),
  private.spoiler_readable(uuid),
  private.spoiler_author(uuid),
  private.spoiler_exists(uuid)
to authenticated;

-- ============================================================
-- Guards
-- ============================================================

-- A spoiler stays where it was made, and keeps its author.
create function private.spoiler_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and (new.parent_kind is distinct from old.parent_kind
          or new.parent_id is distinct from old.parent_id
          or new.author_id is distinct from old.author_id) then
    raise exception 'A spoiler cannot move or change author.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger spoiler_guard before update on public.spoilers
  for each row execute function private.spoiler_guard();

-- A save may not drop the marker of someone else's spoiler (players only;
-- the DM and the database's own functions may). The column is the trigger's
-- argument: backstory or description.
create function private.spoiler_markers_kept()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_old text := to_jsonb(old) ->> tg_argv[0];
  v_new text := coalesce(to_jsonb(new) ->> tg_argv[0], '');
  v_id text;
begin
  if current_user <> 'authenticated' or v_old is null or v_old = v_new or private.is_dm() then
    return new;
  end if;
  for v_id in
    select m[1] from regexp_matches(v_old, '\(spoiler:([0-9a-fA-F-]{36})\)', 'g') as m
  loop
    if position(('(spoiler:' || v_id || ')') in v_new) = 0
       and private.spoiler_exists(v_id::uuid)
       and private.spoiler_author(v_id::uuid) is distinct from (select auth.uid()) then
      raise exception 'Only its author or the DM can remove a spoiler.' using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.spoiler_markers_kept() from public, anon;

create trigger spoiler_markers_kept before update of backstory on public.characters
  for each row execute function private.spoiler_markers_kept('backstory');
create trigger spoiler_markers_kept before update of description on public.npcs
  for each row execute function private.spoiler_markers_kept('description');
create trigger spoiler_markers_kept before update of description on public.world_entries
  for each row execute function private.spoiler_markers_kept('description');

-- ============================================================
-- Row-level security
-- ============================================================

alter table public.spoilers enable row level security;
alter table public.spoiler_knowers enable row level security;
revoke all on public.spoilers, public.spoiler_knowers from anon;
-- New spoilers only through create_spoiler; knowers are added or removed, never changed.
revoke insert, truncate on public.spoilers from authenticated;
revoke update, truncate on public.spoiler_knowers from authenticated;

create policy "read" on public.spoilers for select to authenticated
  using (private.spoiler_readable(id));
create policy "author or dm edits" on public.spoilers for update to authenticated
  using (private.is_dm() or author_id = (select auth.uid()))
  with check (private.is_dm() or author_id = (select auth.uid()));
create policy "author or dm deletes" on public.spoilers for delete to authenticated
  using (private.is_dm() or author_id = (select auth.uid()));

create policy "read" on public.spoiler_knowers for select to authenticated
  using (private.spoiler_readable(spoiler_id));
-- The character must be one the user can see (the characters policies decide).
create policy "author or dm adds" on public.spoiler_knowers for insert to authenticated
  with check (
    (private.is_dm() or private.spoiler_author(spoiler_id) = (select auth.uid()))
    and exists (select 1 from public.characters c where c.id = character_id and c.deleted_at is null)
  );
create policy "author or dm removes" on public.spoiler_knowers for delete to authenticated
  using (private.is_dm() or private.spoiler_author(spoiler_id) = (select auth.uid()));

-- ============================================================
-- API
-- ============================================================

-- Make a spoiler in a text the user may edit. Returns its id; the website
-- then puts [](spoiler:<id>) in the text.
create function public.create_spoiler(p_parent_kind text, p_parent_id uuid, p_text text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in.' using errcode = '42501';
  end if;
  if p_parent_kind not in ('character', 'npc', 'world_entry') then
    raise exception 'Spoilers can only be made in a backstory, an NPC or a World entry.' using errcode = '22023';
  end if;
  if not (private.is_dm() or private.spoiler_parent_editable(p_parent_kind, p_parent_id)) then
    raise exception 'Not allowed to make a spoiler here.' using errcode = '42501';
  end if;

  insert into public.spoilers (parent_kind, parent_id, author_id, text)
  values (p_parent_kind, p_parent_id, (select auth.uid()), coalesce(p_text, ''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.create_spoiler(text, uuid, text) from public, anon;
grant execute on function public.create_spoiler(text, uuid, text) to authenticated;
