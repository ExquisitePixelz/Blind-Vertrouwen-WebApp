-- Phase 8: automatic character sheet (ARCHITECTURE.md 1.10 and 4).
--
-- * characters: the class list, race, background, the Unarmored AC choice,
--   custom modifiers, proficiencies, death saves and inspiration. Read by the
--   campaign and written by the owner and the DM (existing policies).
-- * inventory_items: requires attunement, an armor type and up to 5 bonuses.
--   Private, like the rest of the item.
-- * character_effects: one row per character listing, for every item that
--   counts, its armor type and bonuses, without its name, so every player
--   sees the same AC. A separate row because items are private (RLS works on
--   whole rows, 3.3), and because a trigger that changed the character row
--   would bump its version and give everyone editing it a false conflict
--   (3.4). Only the database writes it.
-- * The JSON fields are checked by CHECK constraints, so the checks hold for
--   every caller, the DM included.
-- * class_level, ac and passive_perception stay until the website no longer
--   uses them; a later migration removes them (Phase 8 step 9).

-- ============================================================
-- Validators for the JSON fields
-- Pure functions, used by CHECK constraints. Each one returns false (never
-- an error) for input of the wrong shape.
-- ============================================================

create function private.ability_keys()
returns text[]
language sql immutable set search_path = ''
as $$
  select array['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
$$;

create function private.skill_keys()
returns text[]
language sql immutable set search_path = ''
as $$
  select array[
    'acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history',
    'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
    'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'
  ];
$$;

-- Everything a custom modifier or an item bonus can go on (1.10).
create function private.targets()
returns text[]
language sql immutable set search_path = ''
as $$
  select array['save.all', 'ac', 'speed', 'passive_perception']
    || array(select 'ability.' || a from unnest(private.ability_keys()) as a)
    || array(select 'save.' || a from unnest(private.ability_keys()) as a)
    || array(select 'skill.' || s from unnest(private.skill_keys()) as s);
$$;

-- A JSON object with exactly these keys, no more and no fewer.
create function private.json_keys_are(p_value jsonb, p_keys text[])
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'object' then false
    else p_value ?& p_keys and (select count(*) from jsonb_object_keys(p_value)) = cardinality(p_keys)
  end;
$$;

-- A JSON whole number (not text, not a fraction) between p_min and p_max.
create function private.json_int_between(p_value jsonb, p_min integer, p_max integer)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'number' then false
    when p_value::text !~ '^-?[0-9]{1,6}$' then false
    else (p_value::text)::integer between p_min and p_max
  end;
$$;

-- A JSON string of at most p_max characters.
create function private.json_text_max(p_value jsonb, p_max integer)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'string' then false
    else char_length(p_value #>> '{}') <= p_max
  end;
$$;

create function private.json_is_uuid(p_value jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'string' then false
    else (p_value #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  end;
$$;

create function private.is_target(p_value jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'string' then false
    else (p_value #>> '{}') = any (private.targets())
  end;
$$;

-- [{name, level}]: 1 to 10 entries, levels 1 to 20, at most 20 in total.
create function private.valid_classes(p_value jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'array' then false
    when jsonb_array_length(p_value) not between 1 and 10 then false
    when octet_length(p_value::text) > 8192 then false
    else (
      select bool_and(
               private.json_keys_are(e, array['name', 'level'])
               and private.json_text_max(e -> 'name', 100)
               and private.json_int_between(e -> 'level', 1, 20))
         and sum(case when private.json_int_between(e -> 'level', 1, 20) then (e ->> 'level')::integer else 21 end) <= 20
      from jsonb_array_elements(p_value) as e
    )
  end;
$$;

-- [{id, target, label, value}]: at most 100.
create function private.valid_modifiers(p_value jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'array' then false
    when jsonb_array_length(p_value) > 100 then false
    when octet_length(p_value::text) > 65536 then false
    else coalesce((
      select bool_and(
               private.json_keys_are(e, array['id', 'target', 'label', 'value'])
               and private.json_is_uuid(e -> 'id')
               and private.is_target(e -> 'target')
               and private.json_text_max(e -> 'label', 100)
               and private.json_int_between(e -> 'value', -30, 30))
      from jsonb_array_elements(p_value) as e
    ), true)
  end;
$$;

-- {"saves": [ability keys], "skills": {skill key: "proficient" | "expertise"}}
create function private.valid_proficiencies(p_value jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when not private.json_keys_are(p_value, array['saves', 'skills']) then false
    when jsonb_typeof(p_value -> 'saves') is distinct from 'array' then false
    when jsonb_typeof(p_value -> 'skills') is distinct from 'object' then false
    when octet_length(p_value::text) > 8192 then false
    else coalesce((
        select bool_and(jsonb_typeof(s) = 'string' and (s #>> '{}') = any (private.ability_keys()))
           and count(distinct s) = count(*)
        from jsonb_array_elements(p_value -> 'saves') as s
      ), true)
      and coalesce((
        select bool_and(k = any (private.skill_keys()) and v in ('"proficient"'::jsonb, '"expertise"'::jsonb))
        from jsonb_each(p_value -> 'skills') as x (k, v)
      ), true)
  end;
$$;

-- An item's bonuses, [{target, value}]: at most 5.
create function private.valid_item_effects(p_value jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'array' then false
    when jsonb_array_length(p_value) > 5 then false
    when octet_length(p_value::text) > 8192 then false
    else coalesce((
      select bool_and(
               private.json_keys_are(e, array['target', 'value'])
               and private.is_target(e -> 'target')
               and private.json_int_between(e -> 'value', -30, 30))
      from jsonb_array_elements(p_value) as e
    ), true)
  end;
$$;

-- Constraints run with the caller's rights, so the validators stay callable
-- by logged-in users (they only look at the value they are given).
revoke all on function
  private.ability_keys(), private.skill_keys(), private.targets(),
  private.json_keys_are(jsonb, text[]), private.json_int_between(jsonb, integer, integer),
  private.json_text_max(jsonb, integer), private.json_is_uuid(jsonb), private.is_target(jsonb),
  private.valid_classes(jsonb), private.valid_modifiers(jsonb),
  private.valid_proficiencies(jsonb), private.valid_item_effects(jsonb)
from public, anon;
grant execute on function
  private.ability_keys(), private.skill_keys(), private.targets(),
  private.json_keys_are(jsonb, text[]), private.json_int_between(jsonb, integer, integer),
  private.json_text_max(jsonb, integer), private.json_is_uuid(jsonb), private.is_target(jsonb),
  private.valid_classes(jsonb), private.valid_modifiers(jsonb),
  private.valid_proficiencies(jsonb), private.valid_item_effects(jsonb)
to authenticated, service_role;

-- ============================================================
-- New columns
-- ============================================================

alter table public.characters
  add column classes jsonb not null default '[{"name": "", "level": 1}]'
    constraint characters_classes_valid check (private.valid_classes(classes)),
  add column race text not null default ''
    constraint characters_race_length check (char_length(race) <= 100),
  add column background text not null default ''
    constraint characters_background_length check (char_length(background) <= 100),
  add column unarmored_ac text not null default 'normal'
    constraint characters_unarmored_ac_valid check (unarmored_ac in ('normal', 'barbarian', 'monk', 'base13')),
  add column modifiers jsonb not null default '[]'
    constraint characters_modifiers_valid check (private.valid_modifiers(modifiers)),
  add column proficiencies jsonb not null default '{"saves": [], "skills": {}}'
    constraint characters_proficiencies_valid check (private.valid_proficiencies(proficiencies)),
  add column death_saves_success smallint not null default 0
    constraint characters_death_saves_success_range check (death_saves_success between 0 and 3),
  add column death_saves_failure smallint not null default 0
    constraint characters_death_saves_failure_range check (death_saves_failure between 0 and 3),
  add column inspiration boolean not null default false;

alter table public.inventory_items
  add column attunement_required boolean not null default false,
  add column armor text
    constraint inventory_items_armor_valid check (armor in (
      'padded', 'leather', 'studded_leather', 'hide', 'chain_shirt', 'scale_mail', 'breastplate',
      'half_plate', 'ring_mail', 'chain_mail', 'splint', 'plate', 'shield'
    )),
  add column effects jsonb not null default '[]'
    constraint inventory_items_effects_valid check (private.valid_item_effects(effects));

-- ============================================================
-- Existing data
-- ============================================================

-- The free-text class becomes the class list (section 4): each part between
-- "/" is an entry, and a number at the end of a part is its level.
create function private.classes_from_text(p_text text)
returns jsonb
language plpgsql immutable set search_path = ''
as $$
declare
  v_part text;
  v_digits text;
  v_name text;
  v_level integer;
  v_total integer := 0;
  v_result jsonb := '[]';
begin
  foreach v_part in array string_to_array(coalesce(p_text, ''), '/') loop
    v_part := btrim(v_part);
    continue when v_part = '';
    v_digits := substring(v_part from '([0-9]+)$');
    if v_digits is null then
      v_name := v_part;
      v_level := 1;
    else
      v_name := btrim(left(v_part, length(v_part) - length(v_digits)));
      -- Read as a decimal first, so a huge number cannot break the migration.
      v_level := least(20, greatest(1, v_digits::numeric))::integer;
    end if;
    -- At most 20 levels and 10 entries in total.
    v_level := least(v_level, 20 - v_total);
    exit when v_level < 1 or jsonb_array_length(v_result) = 10;
    v_result := v_result || jsonb_build_array(jsonb_build_object('name', left(v_name, 100), 'level', v_level));
    v_total := v_total + v_level;
  end loop;
  if jsonb_array_length(v_result) = 0 then
    return '[{"name": "", "level": 1}]';
  end if;
  return v_result;
end;
$$;

-- Checked here, on every database this runs on, before it touches real data.
do $$
begin
  assert private.classes_from_text('') = '[{"name": "", "level": 1}]';
  assert private.classes_from_text('Barbarian') = '[{"name": "Barbarian", "level": 1}]';
  assert private.classes_from_text('Fighter 3') = '[{"name": "Fighter", "level": 3}]';
  assert private.classes_from_text(' Fighter 3 / Wizard 2 ') = '[{"name": "Fighter", "level": 3}, {"name": "Wizard", "level": 2}]';
  assert private.classes_from_text('Rogue 0') = '[{"name": "Rogue", "level": 1}]';
  assert private.classes_from_text('Paladin 99999999999') = '[{"name": "Paladin", "level": 20}]';
  assert private.classes_from_text('Fighter 15 / Wizard 8 / Cleric 2') = '[{"name": "Fighter", "level": 15}, {"name": "Wizard", "level": 5}]';
  assert private.classes_from_text('7') = '[{"name": "", "level": 7}]';
  assert private.classes_from_text(' / ') = '[{"name": "", "level": 1}]';
  assert private.valid_classes(private.classes_from_text(repeat('x', 500)));
end;
$$;

update public.characters
set classes = private.classes_from_text(class_level)
where class_level <> '';

drop function private.classes_from_text(text);

-- Items that are attuned today are items that need attunement.
update public.inventory_items set attunement_required = true where attuned;

-- ============================================================
-- character_effects
-- ============================================================

create table public.character_effects (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  -- Set by the database to the character's owner.
  owner_id uuid references auth.users (id) on delete set null,
  audience text not null default 'members' check (audience = 'members'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  character_id uuid not null unique,
  -- [{item_id, armor, effects}] for every item that counts (1.10).
  items jsonb not null default '[]',

  -- Follows the character to another campaign; goes with a deleted account.
  foreign key (character_id, campaign_id)
    references public.characters (id, campaign_id) on delete cascade on update cascade
);
create index character_effects_campaign_idx on public.character_effects (campaign_id);

create trigger content_stamp before insert or update on public.character_effects
  for each row execute function private.content_stamp();
create trigger character_row_guard before insert or update on public.character_effects
  for each row execute function private.character_row_guard();

-- What an item adds, for every item that counts: not deleted, not hidden by
-- the DM, quantity above 0, equipped, attuned when it needs it, and with
-- armor or bonuses. Only updates the character's existing row (so a
-- character that is being deleted never gets a new one), and only when the
-- list changed.
create function private.rebuild_effects(p_character_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_items jsonb;
begin
  select coalesce(
           jsonb_agg(jsonb_build_object('item_id', i.id, 'armor', i.armor, 'effects', i.effects) order by i.id),
           '[]'::jsonb)
  into v_items
  from public.inventory_items i
  where i.character_id = p_character_id
    and i.deleted_at is null
    and i.audience in ('owner', 'members')
    and i.quantity > 0
    and i.equipped
    and (i.attuned or not i.attunement_required)
    and (i.armor is not null or i.effects <> '[]'::jsonb);

  update public.character_effects e
  set items = v_items
  where e.character_id = p_character_id
    and e.items is distinct from v_items;
end;
$$;

revoke all on function private.rebuild_effects(uuid) from public, anon, authenticated;

create function private.effects_after_item_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.rebuild_effects(new.character_id);
  elsif tg_op = 'DELETE' then
    perform private.rebuild_effects(old.character_id);
  else
    perform private.rebuild_effects(new.character_id);
    -- The DM moved the item to another character.
    if new.character_id is distinct from old.character_id then
      perform private.rebuild_effects(old.character_id);
    end if;
  end if;
  return null;
end;
$$;

revoke all on function private.effects_after_item_change() from public, anon;

-- Every character gets its private row and its effects row the moment it is
-- created, however it is created.
create or replace function private.character_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.character_private (character_id, campaign_id)
  values (new.id, new.campaign_id);
  insert into public.character_effects (character_id, campaign_id)
  values (new.id, new.campaign_id);
  return null;
end;
$$;

-- If the DM gives a character to someone else, its rows go with it.
create or replace function private.character_owner_changed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.character_private set owner_id = new.owner_id where character_id = new.id;
  update public.inventory_items set owner_id = new.owner_id where character_id = new.id;
  update public.character_effects set owner_id = new.owner_id where character_id = new.id;
  return null;
end;
$$;

-- Existing characters get their effects row now (deleted ones a deleted
-- row). No item has armor or bonuses yet, so every list starts empty.
insert into public.character_effects (character_id, campaign_id, owner_id, deleted_at)
select id, campaign_id, owner_id, deleted_at from public.characters;

create trigger rebuild_effects
  after insert or delete
    or update of equipped, attuned, attunement_required, quantity, armor, effects, audience, deleted_at, character_id
  on public.inventory_items
  for each row execute function private.effects_after_item_change();

-- ============================================================
-- Row-level security
-- ============================================================

alter table public.character_effects enable row level security;
revoke all on public.character_effects from anon;
-- Nobody writes it through the API, the DM included: only the functions
-- above (running as the table owner) do.
revoke insert, update, delete, truncate on public.character_effects from authenticated;

create policy "dm read" on public.character_effects for select to authenticated
  using (private.is_dm());
-- The exists() on characters goes through the characters policies, so a
-- character players cannot see (audience owner or dm) hides its effects too.
create policy "members read" on public.character_effects for select to authenticated
  using (
    deleted_at is null
    and private.is_campaign_member(campaign_id)
    and exists (select 1 from public.characters c where c.id = character_id)
  );

-- ============================================================
-- API functions
-- ============================================================

-- Soft-delete a character with its piety tracks, private row, items and
-- effects row (1.3 B3, 1.8, 1.10). Owner or DM only.
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

  update public.character_effects
  set deleted_at = now()
  where character_id = p_character_id and deleted_at is null;

  update public.characters
  set deleted_at = now()
  where id = p_character_id;
end;
$$;
