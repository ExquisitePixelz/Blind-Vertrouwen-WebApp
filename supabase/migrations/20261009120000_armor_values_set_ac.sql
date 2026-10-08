-- Armor values and Set AC (owner decisions, 2026-10-09, section 1.10):
-- * inventory_items: an armor item may change the table's values, for magic
--   armor such as "16 + DEX": armor_ac (the base AC, or a shield's bonus),
--   armor_dex (how much DEX counts) and armor_stealth (disadvantage on
--   Stealth). Empty means "as the armor table". Changing the armor type
--   without changing them clears them, so the website before this change
--   (which only sets the type) never keeps another armor's values.
-- * character_effects lists them too, only when set, so other players
--   calculate the same AC and items without them look exactly as before.
-- * characters.set_ac: a fixed AC (a Tortle's 17). It replaces armor + DEX;
--   a shield and modifiers still add. Empty means "calculate".
-- * characters.unarmored_ac is no longer used. It stays until no phone runs
--   the older website, then a later migration removes it.

alter table public.inventory_items
  add column armor_ac smallint
    constraint inventory_items_armor_ac_range check (armor_ac between 0 and 30),
  add column armor_dex text
    constraint inventory_items_armor_dex_valid check (armor_dex in ('full', 'max2', 'max3', 'none')),
  add column armor_stealth boolean,
  add constraint inventory_items_armor_values_need_armor check (
    armor is not null or (armor_ac is null and armor_dex is null and armor_stealth is null)
  );

alter table public.characters
  add column set_ac smallint
    constraint characters_set_ac_range check (set_ac between 0 and 30);

-- Another armor type means the table's values again, unless the same save
-- sets the values too. No armor means no values.
create function private.armor_values_reset()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.armor is null
     or (new.armor is distinct from old.armor
         and new.armor_ac is not distinct from old.armor_ac
         and new.armor_dex is not distinct from old.armor_dex
         and new.armor_stealth is not distinct from old.armor_stealth) then
    new.armor_ac := null;
    new.armor_dex := null;
    new.armor_stealth := null;
  end if;
  return new;
end;
$$;

revoke all on function private.armor_values_reset() from public, anon;

create trigger armor_values_reset before update on public.inventory_items
  for each row execute function private.armor_values_reset();

create or replace function private.rebuild_effects(p_character_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_items jsonb;
begin
  select coalesce(
           jsonb_agg(
             jsonb_build_object('item_id', i.id, 'armor', i.armor, 'effects', i.effects)
               || jsonb_strip_nulls(jsonb_build_object(
                    'armor_ac', i.armor_ac, 'armor_dex', i.armor_dex, 'armor_stealth', i.armor_stealth))
             order by i.id),
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

drop trigger rebuild_effects on public.inventory_items;
create trigger rebuild_effects
  after insert or delete
    or update of equipped, attuned, attunement_required, quantity, armor, armor_ac, armor_dex, armor_stealth,
      effects, audience, deleted_at, character_id
  on public.inventory_items
  for each row execute function private.effects_after_item_change();
