-- Phase 10: at the table (ARCHITECTURE.md 1.12 and 4).
--
-- * characters: conditions, exhaustion and spent hit dice. Read by the
--   campaign and written by the owner and the DM (existing policies).
-- * A class entry may carry the hit die someone picked (`die`). It is
--   optional, so the website from before Phase 10 keeps working.
-- * long_rest(characters): a long rest for one character or the whole
--   party, in one step. It runs as the caller, so the characters policies
--   decide whose characters someone may rest.

-- ============================================================
-- Validators for the new JSON fields (pure, like Phase 8)
-- ============================================================

create function private.condition_keys()
returns text[]
language sql immutable set search_path = ''
as $$
  select array[
    'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
    'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
  ];
$$;

-- [condition keys], each at most once.
create function private.valid_conditions(p_value jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'array' then false
    when jsonb_array_length(p_value) > 14 then false
    else coalesce((
      select bool_and(jsonb_typeof(c) = 'string' and (c #>> '{}') = any (private.condition_keys()))
         and count(distinct c) = count(*)
      from jsonb_array_elements(p_value) as c
    ), true)
  end;
$$;

-- {"6" | "8" | "10" | "12": spent count from 0 to 20}; a missing key is 0.
create function private.valid_hit_dice(p_value jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'object' then false
    else coalesce((
      select bool_and(k in ('6', '8', '10', '12') and private.json_int_between(v, 0, 20))
      from jsonb_each(p_value) as x (k, v)
    ), true)
  end;
$$;

-- [{name, level, die?}]: 1 to 10 entries, levels 1 to 20, at most 20 in
-- total. `die` (6, 8, 10 or 12) is new and optional (1.12).
create or replace function private.valid_classes(p_value jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) is distinct from 'array' then false
    when jsonb_array_length(p_value) not between 1 and 10 then false
    when octet_length(p_value::text) > 8192 then false
    else (
      select bool_and(
               (private.json_keys_are(e, array['name', 'level'])
                or (private.json_keys_are(e, array['name', 'level', 'die'])
                    and e -> 'die' in ('6'::jsonb, '8'::jsonb, '10'::jsonb, '12'::jsonb)))
               and private.json_text_max(e -> 'name', 100)
               and private.json_int_between(e -> 'level', 1, 20))
         and sum(case when private.json_int_between(e -> 'level', 1, 20) then (e ->> 'level')::integer else 21 end) <= 20
      from jsonb_array_elements(p_value) as e
    )
  end;
$$;

revoke all on function
  private.condition_keys(), private.valid_conditions(jsonb), private.valid_hit_dice(jsonb)
from public, anon;
grant execute on function
  private.condition_keys(), private.valid_conditions(jsonb), private.valid_hit_dice(jsonb)
to authenticated, service_role;

-- ============================================================
-- New columns
-- ============================================================

alter table public.characters
  add column conditions jsonb not null default '[]'
    constraint characters_conditions_valid check (private.valid_conditions(conditions)),
  add column exhaustion smallint not null default 0
    constraint characters_exhaustion_range check (exhaustion between 0 and 6),
  add column hit_dice_spent jsonb not null default '{}'
    constraint characters_hit_dice_spent_valid check (private.valid_hit_dice(hit_dice_spent));

-- ============================================================
-- Long rest
-- ============================================================

-- Spent hit dice after a long rest: back up to half the total level (at
-- least 1), the largest dice first. Keys that reach 0 are left out.
create function private.hit_dice_after_long_rest(p_spent jsonb, p_total_level integer)
returns jsonb
language plpgsql immutable set search_path = ''
as $$
declare
  v_left integer := greatest(1, p_total_level / 2);
  v_result jsonb := '{}';
  v_die text;
  v_spent integer;
  v_back integer;
begin
  foreach v_die in array array['12', '10', '8', '6'] loop
    v_spent := coalesce((p_spent ->> v_die)::integer, 0);
    v_back := least(v_spent, v_left);
    v_left := v_left - v_back;
    if v_spent - v_back > 0 then
      v_result := v_result || jsonb_build_object(v_die, v_spent - v_back);
    end if;
  end loop;
  return v_result;
end;
$$;

revoke all on function private.hit_dice_after_long_rest(jsonb, integer) from public, anon;
grant execute on function private.hit_dice_after_long_rest(jsonb, integer) to authenticated, service_role;

-- A long rest for each character in the list (1.12). Runs as the caller, so
-- a player can only rest their own characters and the DM any. If the caller
-- may not change one of them, the whole call fails and nothing changes. Dead
-- characters (three failed death saves at 0 HP, or exhaustion 6) are
-- skipped. Returns how many characters rested.
create function public.long_rest(p_characters uuid[])
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
  v_character public.characters;
  v_count integer := 0;
begin
  for v_id in select distinct x from unnest(p_characters) as x loop
    select * into v_character
    from public.characters
    where id = v_id and deleted_at is null;

    if not found then
      raise exception 'Not allowed to rest this character.' using errcode = '42501';
    end if;

    if (v_character.hp_cur = 0 and v_character.death_saves_failure >= 3)
       or v_character.exhaustion >= 6 then
      continue;
    end if;

    update public.characters
    set hp_cur = hp_max,
        hp_temp = 0,
        death_saves_success = 0,
        death_saves_failure = 0,
        exhaustion = greatest(0, exhaustion - 1),
        hit_dice_spent = private.hit_dice_after_long_rest(
          hit_dice_spent,
          (select coalesce(sum((e ->> 'level')::integer), 1)::integer
           from jsonb_array_elements(classes) as e))
    where id = v_id;

    if not found then
      raise exception 'Not allowed to rest this character.' using errcode = '42501';
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.long_rest(uuid[]) from public, anon;
grant execute on function public.long_rest(uuid[]) to authenticated;
