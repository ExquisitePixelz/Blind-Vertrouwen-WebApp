-- Hide again (owner decision, 2026-10-08): the DM can hide a revealed quest,
-- NPC or World entry again. What players read in between is not undone.
-- * quests: quest_guard no longer refuses audience 'members' -> 'dm'.
-- * npc_reveals, world_entry_reveals: the DM deletes a reveal; nobody
--   updates one, and players still cannot delete one.

create or replace function private.quest_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.campaign_id is distinct from old.campaign_id then
    raise exception 'A quest cannot move to another campaign.' using errcode = '42501';
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

grant delete on public.npc_reveals, public.world_entry_reveals to authenticated;

create policy "dm hides" on public.npc_reveals for delete to authenticated
  using (private.is_dm());
create policy "dm hides" on public.world_entry_reveals for delete to authenticated
  using (private.is_dm());
