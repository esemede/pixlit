-- Keep public.profiles aligned with Supabase auth users, including OAuth providers.
-- This backfills existing auth users that are missing a profile row, hardens
-- the auth.users insert trigger, and reapplies the requested premium grant.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  user_display_name text;
  user_avatar_url text;
begin
  user_email := coalesce(
    nullif(new.email, ''),
    nullif(new.raw_user_meta_data->>'email', '')
  );

  -- profiles.email is intentionally NOT NULL. Most providers, including Google,
  -- expose an email; if a future provider does not, skip and let application code
  -- decide how to handle an account without an email address.
  if user_email is null then
    return new;
  end if;

  user_display_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    split_part(user_email, '@', 1)
  );

  user_avatar_url := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', '')
  );

  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, user_email, user_display_name, user_avatar_url)
  on conflict (id) do update
    set
      email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill users created before the trigger existed or before it handled OAuth
-- metadata reliably. Inserting profiles also fires on_profile_created_notebook,
-- creating the default notebook for backfilled users.
insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  coalesce(nullif(u.email, ''), nullif(u.raw_user_meta_data->>'email', '')) as email,
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(coalesce(nullif(u.email, ''), nullif(u.raw_user_meta_data->>'email', '')), '@', 1)
  ) as display_name,
  coalesce(
    nullif(u.raw_user_meta_data->>'avatar_url', ''),
    nullif(u.raw_user_meta_data->>'picture', '')
  ) as avatar_url
from auth.users u
where coalesce(nullif(u.email, ''), nullif(u.raw_user_meta_data->>'email', '')) is not null
on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

-- Reapply the one-off premium grant after the backfill, so Google-created users
-- that were missing from profiles are upgraded too.
update public.profiles
set
  plan = 'starter',
  sub_status = 'active',
  sub_provider = null,
  sub_provider_sub_id = null,
  sub_current_period_end = null,
  updated_at = now()
where lower(email) = 'domoedse@gmail.com';
