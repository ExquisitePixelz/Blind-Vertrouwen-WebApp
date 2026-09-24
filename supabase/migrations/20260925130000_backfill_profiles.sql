-- Give every existing login a profile. Accounts that logged in before the
-- initial schema (and its on_auth_user_created trigger) existed had none, so
-- saving their display name or last campaign changed nothing, and they showed
-- as "Unknown player". Same naming rule as private.handle_new_user.

insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
