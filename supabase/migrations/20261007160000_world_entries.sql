-- Phase 12: the rest of World (ARCHITECTURE.md 1.14 and 4).
--
-- * world_entries: places, factions, lore, creatures and items. World
--   content that works exactly like NPCs (Phase 11): revealed per campaign,
--   a shared wiki for players, only the DM deletes (delete_world_entry).
--   Places have a type and may be part of one bigger place; lore has a type.
-- * world_entry_reveals: which campaigns see an entry. Never undone: nobody
--   updates or deletes these rows through the API, the DM included.
-- * world_entry_secrets: DM secrets (and a creature's stats), one row per
--   entry with audience 'dm'. Players can neither read nor write it.
-- * npcs.place_id and faction_id: an NPC's location and faction as entries.

create table public.world_entries (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id),
  -- The creator. Cleared when that account is deleted; the entry stays.
  owner_id uuid default auth.uid() references auth.users (id) on delete set null,
  -- Always 'members'; a player's reading also needs a reveal (world_entry_visible).
  audience text not null default 'members' check (audience = 'members'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  kind text not null check (kind in ('place', 'faction', 'lore', 'creature', 'item')),
  -- Places and lore always have a type; the other kinds never do.
  type text,
  name text not null check (btrim(name) <> ''),
  summary text not null default '',
  description text not null default '',
  -- Places only: the bigger place this one is part of (checked by a trigger).
  parent_id uuid references public.world_entries (id) on delete set null,

  check (
    case kind
      when 'place' then type is not null and type in ('region', 'city', 'town', 'village', 'building', 'dungeon', 'other')
      when 'lore' then type is not null and type in ('history', 'legend', 'prophecy', 'event', 'other')
      else type is null
    end
  ),
  check (parent_id is null or kind = 'place'),
  constraint world_entries_name_length check (char_length(name) <= 100),
  constraint world_entries_summary_length check (char_length(summary) <= 500),
  constraint world_entries_description_length check (char_length(description) <= 100000)
);
create index world_entries_world_kind_idx on public.world_entries (world_id, kind);
create index world_entries_parent_idx on public.world_entries (parent_id);

create table public.world_entry_reveals (
  entry_id uuid not null references public.world_entries (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, campaign_id)
);
create index world_entry_reveals_campaign_idx on public.world_entry_reveals (campaign_id);

create table public.world_entry_secrets (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id),
  owner_id uuid references auth.users (id) on delete set null,
  audience text not null default 'dm' check (audience = 'dm'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  entry_id uuid not null unique references public.world_entries (id) on delete cascade,
  secrets text not null default '',
  -- The stat block, used for creatures (the same columns as npc_secrets).
  has_stats boolean not null default false,
  ac integer check (ac between 0 and 9999),
  hp_max integer check (hp_max between 0 and 9999),
  speed integer check (speed between 0 and 9999),
  strength smallint not null default 10 check (strength between 1 and 30),
  dexterity smallint not null default 10 check (dexterity between 1 and 30),
  constitution smallint not null default 10 check (constitution between 1 and 30),
  intelligence smallint not null default 10 check (intelligence between 1 and 30),
  wisdom smallint not null default 10 check (wisdom between 1 and 30),
  charisma smallint not null default 10 check (charisma between 1 and 30),
  cr text check (cr = any (private.cr_values())),
  actions text not null default '',

  constraint world_entry_secrets_secrets_length check (char_length(secrets) <= 100000),
  constraint world_entry_secrets_actions_length check (char_length(actions) <= 100000)
);

alter table public.npcs
  add column place_id uuid references public.world_entries (id) on delete set null,
  add column faction_id uuid references public.world_entries (id) on delete set null;
create index npcs_place_idx on public.npcs (place_id);
create index npcs_faction_idx on public.npcs (faction_id);

-- ============================================================
-- Helpers (security definer: they see every entry, hidden ones included)
-- ============================================================

-- True when p_id is a live entry of this kind in this world.
create function private.entry_is(p_id uuid, p_world_id uuid, p_kind text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.world_entries e
    where e.id = p_id and e.world_id = p_world_id and e.kind = p_kind and e.deleted_at is null
  );
$$;

-- True when p_ancestor is p_place itself or one of the places it is part of.
create function private.place_within(p_place uuid, p_ancestor uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  with recursive up (id, depth) as (
    select p_place, 0
    union all
    select e.parent_id, up.depth + 1
    from public.world_entries e
    join up on e.id = up.id
    where e.parent_id is not null and up.depth < 1000
  )
  select exists (select 1 from up where up.id = p_ancestor);
$$;

-- True when the entry is revealed to a live campaign the user is in.
create function private.world_entry_visible(p_entry_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.world_entry_reveals r
    join public.campaign_members m on m.campaign_id = r.campaign_id
    join public.campaigns c on c.id = r.campaign_id
    where r.entry_id = p_entry_id
      and m.user_id = (select auth.uid())
      and c.deleted_at is null
  );
$$;

revoke all on function
  private.entry_is(uuid, uuid, text), private.place_within(uuid, uuid), private.world_entry_visible(uuid)
from public, anon;
grant execute on function
  private.entry_is(uuid, uuid, text), private.place_within(uuid, uuid), private.world_entry_visible(uuid)
to authenticated;

-- ============================================================
-- Triggers
-- ============================================================

-- Nobody changes an entry's kind. Players edit the text, never who made it,
-- its world, its audience or whether it is deleted (current_user is
-- 'authenticated' only for direct API calls). A place is part of a live
-- place of the same world, never of itself or of a place inside it.
create function private.world_entry_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.kind is distinct from old.kind then
      raise exception 'An entry cannot change its kind.' using errcode = '42501';
    end if;
    if current_user = 'authenticated' and not private.is_dm() and (
      new.world_id is distinct from old.world_id
      or new.owner_id is distinct from old.owner_id
      or new.audience is distinct from old.audience
      or new.deleted_at is distinct from old.deleted_at
    ) then
      raise exception 'Not allowed to change this field.' using errcode = '42501';
    end if;
  end if;

  if new.parent_id is not null
     and (tg_op = 'INSERT' or new.parent_id is distinct from old.parent_id) then
    if not private.entry_is(new.parent_id, new.world_id, 'place') then
      raise exception 'A place can only be part of another place.' using errcode = '22023';
    end if;
    if private.place_within(new.parent_id, new.id) then
      raise exception 'A place cannot be part of itself or of a place inside it.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

-- Every entry gets its secrets row the moment it is created.
create function private.world_entry_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.world_entry_secrets (entry_id, world_id, owner_id)
  values (new.id, new.world_id, null);
  return null;
end;
$$;

-- A reveal is for a live entry and a live campaign of the same world.
create function private.world_entry_reveal_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.world_entries e
    join public.campaigns c on c.world_id = e.world_id
    where e.id = new.entry_id
      and c.id = new.campaign_id
      and e.deleted_at is null
      and c.deleted_at is null
  ) then
    raise exception 'Unknown entry or campaign.' using errcode = '22023';
  end if;
  new.created_at := now();
  return new;
end;
$$;

-- An NPC's place is a place, and its faction a faction, of its own world.
create function private.npc_links_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.place_id is not null
     and (tg_op = 'INSERT' or new.place_id is distinct from old.place_id)
     and not private.entry_is(new.place_id, new.world_id, 'place') then
    raise exception 'The location must be a place.' using errcode = '22023';
  end if;
  if new.faction_id is not null
     and (tg_op = 'INSERT' or new.faction_id is distinct from old.faction_id)
     and not private.entry_is(new.faction_id, new.world_id, 'faction') then
    raise exception 'The faction must be a faction.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger content_stamp before insert or update on public.world_entries
  for each row execute function private.content_stamp();
create trigger world_entry_guard before insert or update on public.world_entries
  for each row execute function private.world_entry_guard();
create trigger create_secrets_row after insert on public.world_entries
  for each row execute function private.world_entry_after_insert();

create trigger content_stamp before insert or update on public.world_entry_secrets
  for each row execute function private.content_stamp();

create trigger world_entry_reveal_guard before insert on public.world_entry_reveals
  for each row execute function private.world_entry_reveal_guard();

create trigger npc_links_guard before insert or update on public.npcs
  for each row execute function private.npc_links_guard();

-- ============================================================
-- Row-level security
-- ============================================================

alter table public.world_entries enable row level security;
alter table public.world_entry_reveals enable row level security;
alter table public.world_entry_secrets enable row level security;
revoke all on public.world_entries, public.world_entry_reveals, public.world_entry_secrets from anon;
-- A reveal is never undone (1.14, as for NPCs): not even the DM updates or deletes one.
revoke update, delete, truncate on public.world_entry_reveals from authenticated;

create policy "dm all" on public.world_entries for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.world_entries for select to authenticated
  using (deleted_at is null and private.world_entry_visible(id));
create policy "members edit" on public.world_entries for update to authenticated
  using (deleted_at is null and private.world_entry_visible(id))
  with check (private.world_entry_visible(id));

create policy "dm read" on public.world_entry_reveals for select to authenticated
  using (private.is_dm());
create policy "dm reveals" on public.world_entry_reveals for insert to authenticated
  with check (private.is_dm());
create policy "members read" on public.world_entry_reveals for select to authenticated
  using (private.is_campaign_member(campaign_id));

create policy "dm all" on public.world_entry_secrets for all to authenticated
  using (private.is_dm()) with check (private.is_dm());

-- ============================================================
-- API functions
-- ============================================================

-- Create an entry in the world of the given campaign. A place or lore entry
-- starts with the type 'other'. A player's entry is revealed to that
-- campaign at once (the shared wiki); the DM's starts hidden.
create function public.create_world_entry(p_campaign_id uuid, p_kind text, p_name text)
returns public.world_entries
language plpgsql security definer set search_path = ''
as $$
declare
  v_world_id uuid;
  v_entry public.world_entries;
  v_dm boolean := private.is_dm();
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in.' using errcode = '42501';
  end if;
  if not (v_dm or private.is_campaign_member(p_campaign_id)) then
    raise exception 'Not a member of this campaign.' using errcode = '42501';
  end if;

  select c.world_id into v_world_id
  from public.campaigns c
  where c.id = p_campaign_id and c.deleted_at is null;
  if v_world_id is null then
    raise exception 'Unknown campaign.' using errcode = '22023';
  end if;

  insert into public.world_entries (world_id, owner_id, kind, type, name)
  values (
    v_world_id,
    (select auth.uid()),
    p_kind,
    case when p_kind in ('place', 'lore') then 'other' end,
    btrim(p_name)
  )
  returning * into v_entry;

  if not v_dm then
    insert into public.world_entry_reveals (entry_id, campaign_id) values (v_entry.id, p_campaign_id);
  end if;

  return v_entry;
end;
$$;

-- Soft-delete an entry and its secrets. DM only (1.14).
create function public.delete_world_entry(p_entry_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_dm() then
    raise exception 'Only the DM deletes entries.' using errcode = '42501';
  end if;
  update public.world_entry_secrets set deleted_at = now() where entry_id = p_entry_id and deleted_at is null;
  update public.world_entries set deleted_at = now() where id = p_entry_id and deleted_at is null;
end;
$$;

revoke all on function public.create_world_entry(uuid, text, text), public.delete_world_entry(uuid) from public, anon;
grant execute on function public.create_world_entry(uuid, text, text), public.delete_world_entry(uuid) to authenticated;
