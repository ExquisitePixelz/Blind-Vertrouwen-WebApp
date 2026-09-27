-- Phase 7: Quest Journal (ARCHITECTURE.md 1.9 and 4).
--
-- * quests: campaign content. Audience 'dm' while hidden (the default),
--   'members' once revealed. A revealed quest can never be hidden again,
--   not even by the DM.
-- * quest_objectives: players see an objective only when its quest is
--   readable and it is optional, ticked off, or the first main objective not
--   yet ticked off (private.objective_visible). The rest never reaches them.
-- * quest_rewards: audience 'members' (visible) or 'dm' (hidden), switchable
--   both ways. hidden_reward_counts tells players how many are hidden,
--   without their text.
-- * Only the DM writes. There are no player write policies at all.

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id),
  owner_id uuid default auth.uid() references auth.users (id) on delete set null,
  audience text not null default 'dm' check (audience in ('members', 'dm')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  kind text not null default 'side' check (kind in ('main', 'side', 'character')),
  -- Only for character quests. Cleared if the character is removed for good
  -- (an account deletion); a soft-deleted character keeps the link.
  character_id uuid references public.characters (id) on delete set null,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  giver text not null default '',
  location text not null default '',
  status text not null default 'inactive' check (status in ('inactive', 'active', 'completed', 'failed')),

  check (character_id is null or kind = 'character')
);
create index quests_campaign_idx on public.quests (campaign_id);
create index quests_character_idx on public.quests (character_id);

create table public.quest_objectives (
  id uuid primary key default gen_random_uuid(),
  -- Copied from the quest by the database.
  campaign_id uuid not null,
  owner_id uuid default auth.uid() references auth.users (id) on delete set null,
  audience text not null default 'members' check (audience in ('members', 'dm')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  quest_id uuid not null references public.quests (id) on delete cascade,
  text text not null check (btrim(text) <> ''),
  done boolean not null default false,
  optional boolean not null default false,
  -- Filled in by the database when left out: after the quest's last one.
  sort_order integer not null
);
create index quest_objectives_quest_idx on public.quest_objectives (quest_id);

create table public.quest_rewards (
  id uuid primary key default gen_random_uuid(),
  -- Copied from the quest by the database.
  campaign_id uuid not null,
  owner_id uuid default auth.uid() references auth.users (id) on delete set null,
  -- 'members' = visible to players, 'dm' = hidden.
  audience text not null default 'members' check (audience in ('members', 'dm')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  quest_id uuid not null references public.quests (id) on delete cascade,
  text text not null check (btrim(text) <> ''),
  -- Filled in by the database when left out: after the quest's last one.
  sort_order integer not null
);
create index quest_rewards_quest_idx on public.quest_rewards (quest_id);

-- ============================================================
-- Triggers
-- ============================================================

-- A revealed quest stays revealed; a quest stays in its campaign; a
-- character quest points to a live character in the same campaign.
create function private.quest_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.audience = 'members' and new.audience <> 'members' then
      raise exception 'A revealed quest cannot be hidden again.' using errcode = '42501';
    end if;
    if new.campaign_id is distinct from old.campaign_id then
      raise exception 'A quest cannot move to another campaign.' using errcode = '42501';
    end if;
  end if;

  if new.character_id is not null
     and (tg_op = 'INSERT' or new.character_id is distinct from old.character_id)
     and not exists (
       select 1 from public.characters c
       where c.id = new.character_id
         and c.campaign_id = new.campaign_id
         and c.deleted_at is null
     ) then
    raise exception 'That character is not in this campaign.' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- Objectives and rewards: campaign_id comes from the quest, they stay with
-- their quest, and a new one goes after the quest's last one.
create function private.quest_part_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.quest_id is distinct from old.quest_id then
      raise exception 'Cannot move this to another quest.' using errcode = '42501';
    end if;
    new.campaign_id := old.campaign_id;
    return new;
  end if;

  select q.campaign_id into new.campaign_id from public.quests q where q.id = new.quest_id;
  if new.campaign_id is null then
    raise exception 'Unknown quest.' using errcode = '22023';
  end if;

  if new.sort_order is null then
    if tg_table_name = 'quest_objectives' then
      select coalesce(max(o.sort_order), 0) + 1 into new.sort_order
      from public.quest_objectives o where o.quest_id = new.quest_id;
    else
      select coalesce(max(r.sort_order), 0) + 1 into new.sort_order
      from public.quest_rewards r where r.quest_id = new.quest_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger content_stamp before insert or update on public.quests
  for each row execute function private.content_stamp();
create trigger quest_guard before insert or update on public.quests
  for each row execute function private.quest_guard();

create trigger content_stamp before insert or update on public.quest_objectives
  for each row execute function private.content_stamp();
create trigger quest_part_guard before insert or update on public.quest_objectives
  for each row execute function private.quest_part_guard();

create trigger content_stamp before insert or update on public.quest_rewards
  for each row execute function private.content_stamp();
create trigger quest_part_guard before insert or update on public.quest_rewards
  for each row execute function private.quest_part_guard();

-- ============================================================
-- Row-level security
-- ============================================================

-- Objectives are revealed one step at a time (1.9): an objective is visible
-- when it is optional, ticked off, or no earlier main objective (by
-- sort_order, then id) is still open. Security definer, so it sees every
-- objective of the quest, not only the ones the caller may read.
create function private.objective_visible(
  p_quest_id uuid, p_id uuid, p_sort_order integer, p_done boolean, p_optional boolean
)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_optional or p_done or not exists (
    select 1
    from public.quest_objectives o
    where o.quest_id = p_quest_id
      and o.deleted_at is null
      and not o.optional
      and not o.done
      and (o.sort_order, o.id) < (p_sort_order, p_id)
  );
$$;

revoke all on function private.objective_visible(uuid, uuid, integer, boolean, boolean) from public, anon;
grant execute on function private.objective_visible(uuid, uuid, integer, boolean, boolean) to authenticated;

alter table public.quests enable row level security;
alter table public.quest_objectives enable row level security;
alter table public.quest_rewards enable row level security;
revoke all on public.quests, public.quest_objectives, public.quest_rewards from anon;

create policy "dm all" on public.quests for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.quests for select to authenticated
  using (
    deleted_at is null
    and audience = 'members'
    and private.is_campaign_member(campaign_id)
  );

-- The exists() on quests goes through the quests policies above, so a
-- hidden or deleted quest hides its objectives and rewards too.
create policy "dm all" on public.quest_objectives for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.quest_objectives for select to authenticated
  using (
    deleted_at is null
    and audience = 'members'
    and private.is_campaign_member(campaign_id)
    and exists (select 1 from public.quests q where q.id = quest_id)
    and private.objective_visible(quest_id, id, sort_order, done, optional)
  );

create policy "dm all" on public.quest_rewards for all to authenticated
  using (private.is_dm()) with check (private.is_dm());
create policy "members read" on public.quest_rewards for select to authenticated
  using (
    deleted_at is null
    and audience = 'members'
    and private.is_campaign_member(campaign_id)
    and exists (select 1 from public.quests q where q.id = quest_id)
  );

-- ============================================================
-- API functions
-- ============================================================

-- How many rewards of each quest are hidden, for the "+ a hidden reward"
-- line (1.9). Only for quests the caller may read; never the text.
create function public.hidden_reward_counts(p_campaign_id uuid)
returns table (quest_id uuid, hidden integer)
language sql stable security definer set search_path = ''
as $$
  select r.quest_id, count(*)::integer
  from public.quest_rewards r
  join public.quests q on q.id = r.quest_id
  where q.campaign_id = p_campaign_id
    and q.deleted_at is null
    and r.deleted_at is null
    and r.audience = 'dm'
    and (
      private.is_dm()
      or (q.audience = 'members' and private.is_campaign_member(p_campaign_id))
    )
  group by r.quest_id;
$$;

revoke all on function public.hidden_reward_counts(uuid) from public, anon;
grant execute on function public.hidden_reward_counts(uuid) to authenticated;
