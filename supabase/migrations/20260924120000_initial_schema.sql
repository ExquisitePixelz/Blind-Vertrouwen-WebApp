-- Theros DM Companion: initial schema (ARCHITECTURE.md sections 3.3 and 4).
--
-- Rules followed here:
-- * Every table has RLS switched on in this same file. No table is readable
--   without a policy.
-- * The DM (worlds.dm_user_id) can read and write everything.
-- * Content rows have an audience: members / owner / dm.
-- * Timestamps and version numbers are set by the database, never the phone.
-- * Deleting content means setting deleted_at (soft delete).

-- ============================================================
-- Private schema: helpers used by policies. It is not exposed through the
-- API, so these functions cannot be called directly from the website.
-- ============================================================

create schema private;
grant usage on schema private to authenticated;

-- ============================================================
-- Structure tables
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  -- The one DM. Set once by the owner in the Supabase SQL editor.
  dm_user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Players in a campaign. The DM is not listed: the DM has access everywhere.
create table public.campaign_members (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
create index campaign_members_user_idx on public.campaign_members (user_id);

create table public.campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  -- 32 random hex characters; shared as https://dnd.yannickmul.nl/invite/<code>
  code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Content tables
-- Common columns: id, owner_id, audience, version, created_at, updated_at,
-- deleted_at, and either world_id or campaign_id.
-- ============================================================

-- World content: the pantheon (ARCHITECTURE.md 1.3 C1).
create table public.gods (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id),
  owner_id uuid default auth.uid() references auth.users (id) on delete set null,
  audience text not null default 'members' check (audience in ('members', 'owner', 'dm')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (btrim(name) <> ''),
  epithet text not null default '',
  alignment text not null default '',
  domains text not null default '',
  symbol text not null default '',
  notes text not null default '',
  party_attitude smallint not null default 4 check (party_attitude between 1 and 7),
  image_path text,

  unique (world_id, slug)
);

-- How god A sees god B (1.3 C3). Directed and sparse: a missing pair means
-- Neutral (4), so 4 is never stored. Visibility follows the gods themselves.
create table public.god_relationships (
  from_god_id uuid not null references public.gods (id) on delete cascade,
  to_god_id uuid not null references public.gods (id) on delete cascade,
  value smallint not null check (value between 1 and 7 and value <> 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (from_god_id, to_god_id),
  check (from_god_id <> to_god_id)
);
create index god_relationships_to_idx on public.god_relationships (to_god_id);

-- Campaign content: player characters (1.3 B1).
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id),
  owner_id uuid not null default auth.uid() references auth.users (id),
  audience text not null default 'members' check (audience in ('members', 'owner', 'dm')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  name text not null check (btrim(name) <> ''),
  player text not null default '',          -- display label only; ownership is owner_id
  class_level text not null default '',
  ac integer not null default 10 check (ac >= 0),
  hp_max integer not null default 10 check (hp_max >= 1),
  hp_cur integer not null default 10 check (hp_cur between 0 and hp_max),
  hp_temp integer not null default 0 check (hp_temp >= 0),
  speed integer not null default 30 check (speed >= 0),
  passive_perception integer not null default 10 check (passive_perception >= 0),
  strength smallint not null default 10 check (strength between 1 and 30),
  dexterity smallint not null default 10 check (dexterity between 1 and 30),
  constitution smallint not null default 10 check (constitution between 1 and 30),
  intelligence smallint not null default 10 check (intelligence between 1 and 30),
  wisdom smallint not null default 10 check (wisdom between 1 and 30),
  charisma smallint not null default 10 check (charisma between 1 and 30),
  image_path text,

  -- Lets piety_tracks prove its campaign_id matches its character's.
  unique (id, campaign_id)
);
create index characters_campaign_idx on public.characters (campaign_id);

-- Campaign content: a character's piety with a god or a custom source (section 4).
create table public.piety_tracks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  -- Set by the database to the character's owner.
  owner_id uuid references auth.users (id) on delete set null,
  audience text not null default 'members' check (audience in ('members', 'owner', 'dm')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  character_id uuid not null,
  god_id uuid references public.gods (id),
  custom_source_name text check (custom_source_name is null or btrim(custom_source_name) <> ''),
  custom_source_rules text,
  score integer not null default 0,

  foreign key (character_id, campaign_id)
    references public.characters (id, campaign_id) on delete cascade,
  -- Exactly one of: a god, or a custom source.
  check ((god_id is null) <> (custom_source_name is null)),
  check (custom_source_name is not null or custom_source_rules is null)
);
create index piety_tracks_character_idx on public.piety_tracks (character_id);
create index piety_tracks_campaign_idx on public.piety_tracks (campaign_id);
create unique index piety_tracks_one_per_god
  on public.piety_tracks (character_id, god_id)
  where god_id is not null and deleted_at is null;

-- ============================================================
-- Helper functions for policies
-- security definer: they read membership tables without being blocked by
-- those tables' own policies. search_path is empty so nothing can hijack them.
-- ============================================================

create function private.is_dm()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.worlds where dm_user_id = (select auth.uid())
  );
$$;

create function private.is_campaign_member(p_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members m
    join public.campaigns c on c.id = m.campaign_id
    where m.campaign_id = p_campaign_id
      and m.user_id = (select auth.uid())
      and c.deleted_at is null
  );
$$;

-- A world member is a player in any live campaign of that world.
create function private.is_world_member(p_world_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members m
    join public.campaigns c on c.id = m.campaign_id
    where c.world_id = p_world_id
      and m.user_id = (select auth.uid())
      and c.deleted_at is null
  );
$$;

-- True when the user shares at least one live campaign with p_user_id.
create function private.shares_campaign(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members mine
    join public.campaign_members theirs on theirs.campaign_id = mine.campaign_id
    join public.campaigns c on c.id = mine.campaign_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
      and c.deleted_at is null
  );
$$;

-- The audience rule for a non-DM who is already known to be a member.
-- ('dm' rows are never readable by players.)
create function private.audience_allows(p_audience text, p_owner_id uuid)
returns boolean
language sql stable set search_path = ''
as $$
  select p_audience = 'members'
      or (p_audience = 'owner' and p_owner_id = (select auth.uid()));
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ============================================================
-- Triggers: timestamps, versions, and guards
-- ============================================================

-- Structure tables: keep created_at, stamp updated_at.
create function private.touch()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Content tables: timestamps plus the conflict guard (3.4). A save must send
-- the version it loaded; if the row changed since, it fails with HTTP 409.
create function private.content_stamp()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
  else
    if new.version is distinct from old.version then
      raise exception 'This was changed by someone else since you loaded it.'
        using errcode = 'PT409', hint = 'version_conflict';
    end if;
    new.created_at := old.created_at;
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

-- Players may edit their own character, but not move it to someone else or
-- another campaign, and not delete it directly (use delete_character).
-- current_user is 'authenticated' only for direct API calls; the functions
-- below run as the table owner and may make these changes on purpose.
create function private.guard_character_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not private.is_dm() then
    if new.owner_id is distinct from old.owner_id
       or new.campaign_id is distinct from old.campaign_id
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Not allowed to change this field.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Piety tracks belong to the character's owner, and a track a player
-- creates always starts at 0, whatever the website sends (section 4).
create function private.piety_before_insert()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  select c.owner_id into new.owner_id
  from public.characters c
  where c.id = new.character_id;

  if not private.is_dm() then
    new.score := 0;
  end if;
  return new;
end;
$$;

create trigger touch before insert or update on public.profiles
  for each row execute function private.touch();
create trigger touch before insert or update on public.worlds
  for each row execute function private.touch();
create trigger touch before insert or update on public.campaigns
  for each row execute function private.touch();
create trigger touch before insert or update on public.god_relationships
  for each row execute function private.touch();

create trigger content_stamp before insert or update on public.gods
  for each row execute function private.content_stamp();
create trigger content_stamp before insert or update on public.characters
  for each row execute function private.content_stamp();
create trigger content_stamp before insert or update on public.piety_tracks
  for each row execute function private.content_stamp();

create trigger guard_update before update on public.characters
  for each row execute function private.guard_character_update();
create trigger piety_before_insert before insert on public.piety_tracks
  for each row execute function private.piety_before_insert();

-- A profile for every new login, named after the Google account.
create function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      ''
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ============================================================
-- Row-level security
-- Every table: one "DM can do everything" policy, plus narrow player policies.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.worlds enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.campaign_invites enable row level security;
alter table public.gods enable row level security;
alter table public.god_relationships enable row level security;
alter table public.characters enable row level security;
alter table public.piety_tracks enable row level security;

-- Nothing is available without logging in.
revoke all on all tables in schema public from anon;

-- profiles
create policy "dm all" on public.profiles for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "read self and campaign mates" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_campaign(id));
create policy "edit own name" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- worlds
create policy "dm all" on public.worlds for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.worlds for select to authenticated
  using (private.is_world_member(id));

-- campaigns
create policy "dm all" on public.campaigns for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.campaigns for select to authenticated
  using (deleted_at is null and private.is_campaign_member(id));

-- campaign_members (joining happens through accept_invite)
create policy "dm all" on public.campaign_members for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.campaign_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_campaign_member(campaign_id));

-- campaign_invites: DM only
create policy "dm all" on public.campaign_invites for all to authenticated
  using (private.is_dm()) with check (private.is_dm());

-- gods: world content, players read, DM writes
create policy "dm all" on public.gods for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.gods for select to authenticated
  using (
    deleted_at is null
    and private.is_world_member(world_id)
    and private.audience_allows(audience, owner_id)
  );

-- god_relationships: readable when both gods are readable
create policy "dm all" on public.god_relationships for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.god_relationships for select to authenticated
  using (
    exists (select 1 from public.gods g where g.id = from_god_id)
    and exists (select 1 from public.gods g where g.id = to_god_id)
  );

-- characters: campaign content, owner and DM write
create policy "dm all" on public.characters for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.characters for select to authenticated
  using (
    deleted_at is null
    and private.is_campaign_member(campaign_id)
    and private.audience_allows(audience, owner_id)
  );
create policy "owner creates" on public.characters for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and deleted_at is null
    and private.is_campaign_member(campaign_id)
  );
create policy "owner edits" on public.characters for update to authenticated
  using (
    owner_id = (select auth.uid())
    and deleted_at is null
    and private.is_campaign_member(campaign_id)
  )
  with check (
    owner_id = (select auth.uid())
    and private.is_campaign_member(campaign_id)
  );

-- piety_tracks: players read; all writes are the DM's (players create their
-- one starting track only through create_character)
create policy "dm all" on public.piety_tracks for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.piety_tracks for select to authenticated
  using (
    deleted_at is null
    and private.is_campaign_member(campaign_id)
    and private.audience_allows(audience, owner_id)
  );

-- ============================================================
-- API functions (callable from the website with supabase.rpc)
-- ============================================================

-- Create a character and, if a god is chosen, its piety track at score 0,
-- in one step, so there is never a half-created character (section 4).
-- p_god_id null means "No god / other": the DM sets up a custom source later.
create function public.create_character(p_campaign_id uuid, p_name text, p_god_id uuid default null)
returns public.characters
language plpgsql security definer set search_path = ''
as $$
declare
  v_character public.characters;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in.' using errcode = '42501';
  end if;
  if not (private.is_dm() or private.is_campaign_member(p_campaign_id)) then
    raise exception 'Not a member of this campaign.' using errcode = '42501';
  end if;
  if p_god_id is not null and not exists (
    select 1
    from public.gods g
    join public.campaigns c on c.world_id = g.world_id
    where g.id = p_god_id
      and c.id = p_campaign_id
      and g.deleted_at is null
      and g.audience = 'members'
  ) then
    raise exception 'Unknown god.' using errcode = '22023';
  end if;

  insert into public.characters (campaign_id, owner_id, name)
  values (p_campaign_id, (select auth.uid()), btrim(p_name))
  returning * into v_character;

  if p_god_id is not null then
    insert into public.piety_tracks (campaign_id, character_id, god_id, score)
    values (p_campaign_id, v_character.id, p_god_id, 0);
  end if;

  return v_character;
end;
$$;

-- Soft-delete a character and its piety tracks (1.3 B3). Owner or DM only.
create function public.delete_character(p_character_id uuid)
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

  update public.characters
  set deleted_at = now()
  where id = p_character_id;
end;
$$;

-- Join a campaign with an invite code. Returns the campaign id.
create function public.accept_invite(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_campaign_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in.' using errcode = '42501';
  end if;

  select i.campaign_id into v_campaign_id
  from public.campaign_invites i
  join public.campaigns c on c.id = i.campaign_id
  where i.code = p_code
    and i.revoked_at is null
    and (i.expires_at is null or i.expires_at > now())
    and c.deleted_at is null;

  if not found then
    raise exception 'This invite link is invalid or has expired.' using errcode = 'PT404';
  end if;

  insert into public.campaign_members (campaign_id, user_id)
  values (v_campaign_id, (select auth.uid()))
  on conflict do nothing;

  return v_campaign_id;
end;
$$;

revoke all on function public.create_character(uuid, text, uuid) from public, anon;
revoke all on function public.delete_character(uuid) from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.create_character(uuid, text, uuid) to authenticated;
grant execute on function public.delete_character(uuid) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
