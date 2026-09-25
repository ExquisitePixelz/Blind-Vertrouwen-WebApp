-- Phase 6: player features (ARCHITECTURE.md 1.8 and 4).
--
-- * characters.backstory: read by everyone in the campaign, like the rest of
--   the character. Written by the owner and the DM (existing policies).
-- * character_private: private notes and coins, one row per character, with
--   audience 'owner' (the player and the DM). A separate row, because RLS
--   works on whole rows (3.3). The database creates it with the character;
--   players only read and update it.
-- * inventory_items: audience 'owner'. The owner and the DM create and edit;
--   deleting goes through delete_item (soft delete).
-- * On both, owner_id and campaign_id come from the character, set by the
--   database, and owner_id follows the character if its owner changes.
--   Players cannot change owner_id, campaign_id, character_id or deleted_at,
--   and cannot set any audience but 'owner'.

alter table public.characters add column backstory text not null default '';

create table public.character_private (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  -- Set by the database to the character's owner.
  owner_id uuid references auth.users (id) on delete set null,
  audience text not null default 'owner' check (audience in ('members', 'owner', 'dm')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  character_id uuid not null unique,
  notes text not null default '',
  cp integer not null default 0 check (cp between 0 and 999999),
  sp integer not null default 0 check (sp between 0 and 999999),
  gp integer not null default 0 check (gp between 0 and 999999),
  pp integer not null default 0 check (pp between 0 and 999999),

  foreign key (character_id, campaign_id)
    references public.characters (id, campaign_id) on delete cascade on update cascade
);
create index character_private_campaign_idx on public.character_private (campaign_id);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  -- Set by the database to the character's owner.
  owner_id uuid references auth.users (id) on delete set null,
  audience text not null default 'owner' check (audience in ('members', 'owner', 'dm')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  character_id uuid not null,
  name text not null check (btrim(name) <> ''),
  quantity integer not null default 1 check (quantity between 0 and 9999),
  weight numeric(7, 2) not null default 0 check (weight >= 0), -- lb per item
  description text not null default '',
  equipped boolean not null default false,
  attuned boolean not null default false,

  foreign key (character_id, campaign_id)
    references public.characters (id, campaign_id) on delete cascade on update cascade
);
create index inventory_items_character_idx on public.inventory_items (character_id);
create index inventory_items_campaign_idx on public.inventory_items (campaign_id);

-- ============================================================
-- Triggers
-- ============================================================

-- Rows that belong to a character: owner_id and campaign_id always come from
-- the character. A player may not move the row to another character, or
-- bypass soft delete. It runs with the caller's rights: a character the
-- caller cannot read counts as unknown. current_user is 'authenticated' only
-- for direct API calls; the functions in this file run as the table owner
-- and may make these changes on purpose (the backfill, owner changes, and
-- soft deletes).
create function private.character_row_guard()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_character public.characters;
begin
  if tg_op = 'UPDATE' and current_user = 'authenticated' and not private.is_dm() then
    if new.owner_id is distinct from old.owner_id
       or new.campaign_id is distinct from old.campaign_id
       or new.character_id is distinct from old.character_id
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Not allowed to change this field.' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'INSERT' or new.character_id is distinct from old.character_id then
    select * into v_character from public.characters where id = new.character_id;
    if not found or (v_character.deleted_at is not null and current_user = 'authenticated') then
      raise exception 'Unknown character.' using errcode = '22023';
    end if;
    new.owner_id := v_character.owner_id;
    new.campaign_id := v_character.campaign_id;
  end if;
  return new;
end;
$$;

create trigger content_stamp before insert or update on public.character_private
  for each row execute function private.content_stamp();
create trigger content_stamp before insert or update on public.inventory_items
  for each row execute function private.content_stamp();
create trigger character_row_guard before insert or update on public.character_private
  for each row execute function private.character_row_guard();
create trigger character_row_guard before insert or update on public.inventory_items
  for each row execute function private.character_row_guard();

-- Every character gets its private row the moment it is created, however it
-- is created (create_character, or a direct insert).
create function private.character_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.character_private (character_id, campaign_id)
  values (new.id, new.campaign_id);
  return null;
end;
$$;

create trigger create_private_row after insert on public.characters
  for each row execute function private.character_after_insert();

-- If the DM gives a character to someone else, its private row and items go
-- with it.
create function private.character_owner_changed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.character_private set owner_id = new.owner_id where character_id = new.id;
  update public.inventory_items set owner_id = new.owner_id where character_id = new.id;
  return null;
end;
$$;

create trigger follow_owner after update of owner_id on public.characters
  for each row when (new.owner_id is distinct from old.owner_id)
  execute function private.character_owner_changed();

-- Existing characters get their private row now (deleted ones a deleted row).
insert into public.character_private (character_id, campaign_id, owner_id, deleted_at)
select id, campaign_id, owner_id, deleted_at from public.characters;

-- ============================================================
-- Row-level security
-- ============================================================

alter table public.character_private enable row level security;
alter table public.inventory_items enable row level security;
revoke all on public.character_private, public.inventory_items from anon;

-- character_private: owner and DM read and update; nobody but the database
-- (and the DM) inserts or deletes.
create policy "dm all" on public.character_private for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.character_private for select to authenticated
  using (
    deleted_at is null
    and private.is_campaign_member(campaign_id)
    and private.audience_allows(audience, owner_id)
  );
create policy "owner edits" on public.character_private for update to authenticated
  using (
    owner_id = (select auth.uid())
    and deleted_at is null
    and private.is_campaign_member(campaign_id)
  )
  with check (
    owner_id = (select auth.uid())
    and audience = 'owner'
    and private.is_campaign_member(campaign_id)
  );

-- inventory_items: owner and DM read and write.
create policy "dm all" on public.inventory_items for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.inventory_items for select to authenticated
  using (
    deleted_at is null
    and private.is_campaign_member(campaign_id)
    and private.audience_allows(audience, owner_id)
  );
create policy "owner creates" on public.inventory_items for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and audience = 'owner'
    and deleted_at is null
    and private.is_campaign_member(campaign_id)
  );
create policy "owner edits" on public.inventory_items for update to authenticated
  using (
    owner_id = (select auth.uid())
    and deleted_at is null
    and private.is_campaign_member(campaign_id)
  )
  with check (
    owner_id = (select auth.uid())
    and audience = 'owner'
    and private.is_campaign_member(campaign_id)
  );

-- ============================================================
-- API functions
-- ============================================================

-- Soft-delete an item. Owner (still in the campaign) or DM only.
create function public.delete_item(p_item_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_item public.inventory_items;
begin
  select * into v_item
  from public.inventory_items
  where id = p_item_id and deleted_at is null;

  if not found or not (
    private.is_dm()
    or (v_item.owner_id = (select auth.uid())
        and private.is_campaign_member(v_item.campaign_id))
  ) then
    raise exception 'Not allowed to delete this item.' using errcode = '42501';
  end if;

  update public.inventory_items set deleted_at = now() where id = p_item_id;
end;
$$;

revoke all on function public.delete_item(uuid) from public, anon;
grant execute on function public.delete_item(uuid) to authenticated;

-- Soft-delete a character with its piety tracks, private row and items
-- (1.3 B3, 1.8). Owner or DM only.
create or replace function public.delete_character(p_character_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_character public.characters;
begin
  select * into v_character
  from public.characters
  where id = p_character_id and deleted_at is null;

  if not found or not (
    private.is_dm()
    or (v_character.owner_id = (select auth.uid())
        and private.is_campaign_member(v_character.campaign_id))
  ) then
    raise exception 'Not allowed to delete this character.' using errcode = '42501';
  end if;

  update public.piety_tracks
  set deleted_at = now()
  where character_id = p_character_id and deleted_at is null;

  update public.character_private
  set deleted_at = now()
  where character_id = p_character_id and deleted_at is null;

  update public.inventory_items
  set deleted_at = now()
  where character_id = p_character_id and deleted_at is null;

  update public.characters
  set deleted_at = now()
  where id = p_character_id;
end;
$$;
