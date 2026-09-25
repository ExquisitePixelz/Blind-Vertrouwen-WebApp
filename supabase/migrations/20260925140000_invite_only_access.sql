-- Phase 4.6: invite-only access (ARCHITECTURE.md 1.6).
--
-- * Allowed in: the DM, and anyone in at least one live campaign (joined with
--   an invite link). Everyone else is signed out by the website.
-- * check_access() tells the website whether the caller is allowed, and
--   deletes a not-allowed account that owns nothing (a stranger who just
--   logged in), so strangers' accounts do not pile up. A removed player who
--   still owns characters keeps the account, but is not let in.
-- * Before the DM is set (a fresh install), everyone is allowed, so the owner
--   can log in once and make themselves the DM (README).
-- * Removing a player is deleting their campaign_members row, which only the
--   DM may do ("dm all" is the only write policy on that table).
-- Row-level security is unchanged and remains the real lock: a not-allowed
-- account that skips the website still reads nothing.

create function private.is_allowed()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_dm()
      or not exists (select 1 from public.worlds where dm_user_id is not null)
      or exists (
        select 1
        from public.campaign_members m
        join public.campaigns c on c.id = m.campaign_id
        where m.user_id = (select auth.uid())
          and c.deleted_at is null
      );
$$;

revoke all on function private.is_allowed() from public, anon;
grant execute on function private.is_allowed() to authenticated;

create function public.check_access()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Not logged in.' using errcode = '42501';
  end if;
  if private.is_allowed() then
    return true;
  end if;
  -- Characters (even deleted ones) keep their owner; everything else that
  -- points at a user is removed or cleared along with the account.
  if not exists (select 1 from public.characters where owner_id = v_user) then
    delete from auth.users where id = v_user;
  end if;
  return false;
end;
$$;

revoke all on function public.check_access() from public, anon;
grant execute on function public.check_access() to authenticated;

-- A player deletes their own account, permanently (1.6): the login, profile
-- and memberships, and their characters with their piety tracks. Not a soft
-- delete: the point is that their data is gone. The DM's account cannot be
-- deleted this way (Theros needs its DM).
create function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Not logged in.' using errcode = '42501';
  end if;
  if private.is_dm() then
    raise exception 'The DM account cannot be deleted.' using errcode = '42501';
  end if;
  delete from public.characters where owner_id = v_user; -- piety tracks go with them
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
