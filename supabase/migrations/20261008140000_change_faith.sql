-- Change faith (owner decision, 2026-10-08): a player changes their own
-- character's god, or types a custom faith such as Oracle, on the character
-- page. Before this, only the DM could, and players could not type a custom
-- faith at all.
-- * piety_tracks.former: true for a faith the character left. The track keeps
--   its score; choosing that god again makes it current, with its score.
-- * change_faith(character, god | custom name and description | neither):
--   the only way players write tracks. A new track starts at 0, and no score
--   ever changes here. The score stays the DM's.
-- * One custom faith per character: choosing a custom faith reuses the
--   character's custom track (renaming it, score kept), so switching between
--   custom faiths cannot pile up tracks. A god track already exists at most
--   once per god (piety_tracks_one_per_god).
-- * create_character also takes a custom faith.

alter table public.piety_tracks add column former boolean not null default false;

create function public.change_faith(
  p_character_id uuid,
  p_god_id uuid default null,
  p_custom_name text default null,
  p_custom_rules text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_character public.characters;
  v_name text := nullif(btrim(p_custom_name), '');
  v_rules text := nullif(btrim(p_custom_rules), '');
  v_track_id uuid;
begin
  -- The lock makes two changes to one character run one after the other.
  select * into v_character
  from public.characters
  where id = p_character_id and deleted_at is null
  for update;

  if not found or not (
    private.is_dm()
    or (v_character.owner_id = (select auth.uid())
        and private.is_campaign_member(v_character.campaign_id))
  ) then
    raise exception 'Not allowed to change this character''s faith.' using errcode = '42501';
  end if;
  if p_god_id is not null and v_name is not null then
    raise exception 'Pick a god or a custom faith, not both.' using errcode = '22023';
  end if;
  if v_name is null and v_rules is not null then
    raise exception 'A custom faith needs a name.' using errcode = '22023';
  end if;
  if p_god_id is not null and not exists (
    select 1
    from public.gods g
    join public.campaigns c on c.world_id = g.world_id
    where g.id = p_god_id
      and c.id = v_character.campaign_id
      and g.deleted_at is null
      and g.audience = 'members'
  ) then
    raise exception 'Unknown god.' using errcode = '22023';
  end if;

  -- The chosen faith's track, if the character already has one.
  if p_god_id is not null then
    select id into v_track_id
    from public.piety_tracks
    where character_id = p_character_id and god_id = p_god_id and deleted_at is null;
  elsif v_name is not null then
    select id into v_track_id
    from public.piety_tracks
    where character_id = p_character_id and god_id is null and deleted_at is null
    order by former, created_at
    limit 1;
  end if;

  -- Every other current track becomes former, keeping its score.
  update public.piety_tracks
  set former = true
  where character_id = p_character_id
    and deleted_at is null
    and not former
    and id is distinct from v_track_id;

  if v_track_id is not null then
    -- Only when something changes, so nobody gets a needless version conflict.
    update public.piety_tracks
    set former = false,
        custom_source_name = coalesce(v_name, custom_source_name),
        custom_source_rules = case when v_name is null then custom_source_rules else v_rules end
    where id = v_track_id
      and (former
           or (v_name is not null
               and (custom_source_name is distinct from v_name
                    or custom_source_rules is distinct from v_rules)));
  elsif p_god_id is not null or v_name is not null then
    insert into public.piety_tracks (campaign_id, character_id, god_id, custom_source_name, custom_source_rules, score)
    values (v_character.campaign_id, p_character_id, p_god_id, v_name, v_rules, 0);
  end if;
end;
$$;

-- create_character gets a custom faith. Calls with only a god (the website
-- before this change) still work, through the defaults.
drop function public.create_character(uuid, text, uuid);

create function public.create_character(
  p_campaign_id uuid,
  p_name text,
  p_god_id uuid default null,
  p_custom_name text default null,
  p_custom_rules text default null
)
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

  insert into public.characters (campaign_id, owner_id, name)
  values (p_campaign_id, (select auth.uid()), btrim(p_name))
  returning * into v_character;

  -- A refused faith (unknown god, both a god and a custom faith) refuses the
  -- whole call, so there is never a half-created character.
  if p_god_id is not null or nullif(btrim(p_custom_name), '') is not null
     or nullif(btrim(p_custom_rules), '') is not null then
    perform public.change_faith(v_character.id, p_god_id, p_custom_name, p_custom_rules);
  end if;

  return v_character;
end;
$$;

revoke all on function public.change_faith(uuid, uuid, text, text) from public, anon;
revoke all on function public.create_character(uuid, text, uuid, text, text) from public, anon;
grant execute on function public.change_faith(uuid, uuid, text, text) to authenticated;
grant execute on function public.create_character(uuid, text, uuid, text, text) to authenticated;
