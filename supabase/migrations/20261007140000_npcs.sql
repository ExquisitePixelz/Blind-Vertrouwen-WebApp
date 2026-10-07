-- Phase 11: NPCs (ARCHITECTURE.md 1.13 and 4).
--
-- * npcs: world content, one library for every campaign. A shared wiki:
--   players read and edit every NPC revealed to a campaign they are in.
--   Only the DM deletes (delete_npc, soft delete).
-- * npc_reveals: which campaigns see an NPC. A reveal is never undone:
--   nobody updates or deletes these rows through the API, the DM included.
-- * npc_secrets: the DM's secrets and the NPC's stats, one row per NPC with
--   audience 'dm'. Players can neither read nor write it (3.3).
-- * create_npc(campaign, name): a player's NPC is revealed to their campaign
--   at once; the DM's starts hidden.

create table public.npcs (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id),
  -- The creator. Cleared when that account is deleted; the NPC stays.
  owner_id uuid default auth.uid() references auth.users (id) on delete set null,
  -- Always 'members'; a player's reading also needs a reveal (npc_visible).
  audience text not null default 'members' check (audience = 'members'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  name text not null check (btrim(name) <> ''),
  role text not null default '',
  status text not null default 'alive' check (status in ('alive', 'dead', 'missing', 'unknown')),
  location text not null default '',
  faction text not null default '',
  description text not null default '',

  constraint npcs_name_length check (char_length(name) <= 100),
  constraint npcs_role_length check (char_length(role) <= 500),
  constraint npcs_location_length check (char_length(location) <= 500),
  constraint npcs_faction_length check (char_length(faction) <= 500),
  constraint npcs_description_length check (char_length(description) <= 100000)
);
create index npcs_world_idx on public.npcs (world_id);

create table public.npc_reveals (
  npc_id uuid not null references public.npcs (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (npc_id, campaign_id)
);
create index npc_reveals_campaign_idx on public.npc_reveals (campaign_id);

-- '0', '1/8', '1/4', '1/2', '1' … '30'
create function private.cr_values()
returns text[]
language sql immutable set search_path = ''
as $$
  select array['0', '1/8', '1/4', '1/2'] || array(select g::text from generate_series(1, 30) as g);
$$;

create table public.npc_secrets (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id),
  owner_id uuid references auth.users (id) on delete set null,
  audience text not null default 'dm' check (audience = 'dm'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  npc_id uuid not null unique references public.npcs (id) on delete cascade,
  secrets text not null default '',
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

  constraint npc_secrets_secrets_length check (char_length(secrets) <= 100000),
  constraint npc_secrets_actions_length check (char_length(actions) <= 100000)
);

-- ============================================================
-- Triggers
-- ============================================================

-- Players edit the text of an NPC, never who made it, its world, its
-- audience or whether it is deleted. current_user is 'authenticated' only
-- for direct API calls; the functions below run as the table owner.
create function private.npc_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not private.is_dm() then
    if new.world_id is distinct from old.world_id
       or new.owner_id is distinct from old.owner_id
       or new.audience is distinct from old.audience
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Not allowed to change this field.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Every NPC gets its secrets row the moment it is created.
create function private.npc_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.npc_secrets (npc_id, world_id, owner_id)
  values (new.id, new.world_id, null);
  return null;
end;
$$;

-- A reveal is for a live NPC and a live campaign of the same world.
create function private.npc_reveal_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.npcs n
    join public.campaigns c on c.world_id = n.world_id
    where n.id = new.npc_id
      and c.id = new.campaign_id
      and n.deleted_at is null
      and c.deleted_at is null
  ) then
    raise exception 'Unknown NPC or campaign.' using errcode = '22023';
  end if;
  new.created_at := now();
  return new;
end;
$$;

create trigger content_stamp before insert or update on public.npcs
  for each row execute function private.content_stamp();
create trigger npc_guard before update on public.npcs
  for each row execute function private.npc_guard();
create trigger create_secrets_row after insert on public.npcs
  for each row execute function private.npc_after_insert();

create trigger content_stamp before insert or update on public.npc_secrets
  for each row execute function private.content_stamp();

create trigger npc_reveal_guard before insert on public.npc_reveals
  for each row execute function private.npc_reveal_guard();

-- ============================================================
-- Row-level security
-- ============================================================

-- True when the NPC is revealed to a live campaign the user is in.
-- Security definer, so it reads the reveals and memberships directly.
create function private.npc_visible(p_npc_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.npc_reveals r
    join public.campaign_members m on m.campaign_id = r.campaign_id
    join public.campaigns c on c.id = r.campaign_id
    where r.npc_id = p_npc_id
      and m.user_id = (select auth.uid())
      and c.deleted_at is null
  );
$$;

revoke all on function private.cr_values(), private.npc_visible(uuid) from public, anon;
grant execute on function private.cr_values(), private.npc_visible(uuid) to authenticated;

alter table public.npcs enable row level security;
alter table public.npc_reveals enable row level security;
alter table public.npc_secrets enable row level security;
revoke all on public.npcs, public.npc_reveals, public.npc_secrets from anon;
-- A reveal is never undone (1.13): not even the DM updates or deletes one.
revoke update, delete, truncate on public.npc_reveals from authenticated;

-- npcs: the DM does everything; players read and edit revealed NPCs. There
-- is no player insert policy: players create NPCs through create_npc.
create policy "dm all" on public.npcs for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.npcs for select to authenticated
  using (deleted_at is null and private.npc_visible(id));
create policy "members edit" on public.npcs for update to authenticated
  using (deleted_at is null and private.npc_visible(id))
  with check (private.npc_visible(id));

-- npc_reveals: the DM reads and adds; players read their campaigns' rows.
create policy "dm read" on public.npc_reveals for select to authenticated
  using (private.is_dm());
create policy "dm reveals" on public.npc_reveals for insert to authenticated
  with check (private.is_dm());
create policy "members read" on public.npc_reveals for select to authenticated
  using (private.is_campaign_member(campaign_id));

-- npc_secrets: the DM only.
create policy "dm all" on public.npc_secrets for all to authenticated
  using (private.is_dm()) with check (private.is_dm());

-- ============================================================
-- API functions
-- ============================================================

-- Create an NPC in the world of the given campaign. A player's NPC is
-- revealed to that campaign at once (the shared wiki); the DM's starts
-- hidden.
create function public.create_npc(p_campaign_id uuid, p_name text)
returns public.npcs
language plpgsql security definer set search_path = ''
as $$
declare
  v_world_id uuid;
  v_npc public.npcs;
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

  insert into public.npcs (world_id, owner_id, name)
  values (v_world_id, (select auth.uid()), btrim(p_name))
  returning * into v_npc;

  if not v_dm then
    insert into public.npc_reveals (npc_id, campaign_id) values (v_npc.id, p_campaign_id);
  end if;

  return v_npc;
end;
$$;

-- Soft-delete an NPC and its secrets. DM only (1.13).
create function public.delete_npc(p_npc_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_dm() then
    raise exception 'Only the DM deletes NPCs.' using errcode = '42501';
  end if;
  update public.npc_secrets set deleted_at = now() where npc_id = p_npc_id and deleted_at is null;
  update public.npcs set deleted_at = now() where id = p_npc_id and deleted_at is null;
end;
$$;

revoke all on function public.create_npc(uuid, text), public.delete_npc(uuid) from public, anon;
grant execute on function public.create_npc(uuid, text), public.delete_npc(uuid) to authenticated;
