-- Phase 4.7: email and password login (ARCHITECTURE.md 1.7).
--
-- Supabase calls this "Before User Created" hook for every new account.
-- * A new email account must carry a valid invite code (sent by the invite
--   page as user_metadata.invite_code): not revoked, not expired, and its
--   campaign not deleted. Otherwise the sign-up is refused, so strangers
--   cannot create accounts or make the site send them mail.
-- * Other sign-ups (Google) pass; invite-only access for them is check_access
--   (Phase 4.6).
-- The code only allows the account to be created; joining still happens
-- through accept_invite once the email is confirmed.
--
-- Switched on in supabase/config.toml (tests) and, for the real project, in
-- the dashboard under Authentication → Hooks (README).

create function private.before_user_created(event jsonb)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_code text := event -> 'user' -> 'user_metadata' ->> 'invite_code';
begin
  if (event -> 'user' -> 'app_metadata' ->> 'provider') is distinct from 'email' then
    return '{}'::jsonb;
  end if;
  if v_code is not null and exists (
    select 1
    from public.campaign_invites i
    join public.campaigns c on c.id = i.campaign_id
    where i.code = v_code
      and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
      and c.deleted_at is null
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'You can only create an account with an invite link from the DM.'
    )
  );
end;
$$;

grant usage on schema private to supabase_auth_admin;
revoke all on function private.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function private.before_user_created(jsonb) to supabase_auth_admin;
