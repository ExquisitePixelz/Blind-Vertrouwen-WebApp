-- Phase 4.5: look and navigation (ARCHITECTURE.md 1.5).
--
-- * profiles.last_campaign_id: the campaign the dashboard opens on,
--   remembered per account so phone and laptop agree. Players already edit
--   only their own profile ("edit own name"); the trigger below also stops
--   them pointing it at a campaign they are not in.
-- * campaigns.subtitle: shown under the campaign name on the dashboard.
--   Empty means the default, "A Theros campaign". Campaigns stay DM-only to
--   write ("dm all" is their only write policy).

alter table public.profiles
  add column last_campaign_id uuid references public.campaigns (id) on delete set null;

alter table public.campaigns
  add column subtitle text not null default '';

create function private.guard_profile_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and not private.is_dm()
     and new.last_campaign_id is not null
     and new.last_campaign_id is distinct from old.last_campaign_id
     and not private.is_campaign_member(new.last_campaign_id) then
    raise exception 'Not a member of this campaign.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_profile_update() from public, anon;

create trigger guard_update before update on public.profiles
  for each row execute function private.guard_profile_update();
