-- Personalization: an avatar on the profile (a built-in preset or an uploaded
-- photo) and private per-user settings (weekly practice goal, page background).
-- The theme override is per device and lives in localStorage, not here.

-- ---------------------------------------------------------------------------
-- profiles: avatar
-- ---------------------------------------------------------------------------
-- avatar_preset names one of the app's built-in icons (src/lib/avatars.ts).
-- avatar_path is an uploaded photo in the private 'resources' bucket at
-- {user_id}/avatar/{random}.jpg, so the existing storage policies (own folder
-- only, 50 MB per account) already cover it. avatar_url stays unused.
alter table public.profiles
  add column avatar_preset text check (
    avatar_preset is null
    or avatar_preset in ('mascot', 'guitar', 'music', 'mic', 'drum', 'headphones', 'piano', 'radio', 'disc')
  ),
  add column avatar_path text check (
    avatar_path is null
    or (starts_with(avatar_path, id::text || '/avatar/') and char_length(avatar_path) <= 300)
  );

-- 0001 granted UPDATE column by column; add the new ones.
grant update (avatar_preset, avatar_path) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- user_settings: private preferences that follow the account across devices
-- ---------------------------------------------------------------------------
-- One row per user, created by the app's first upsert. A missing row means
-- the defaults.
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  weekly_goal_min integer check (weekly_goal_min is null or weekly_goal_min between 10 and 3000),
  background text not null default 'plain' check (background in ('plain', 'dots', 'staff', 'wash')),
  updated_at timestamptz not null default now()
);

create function public.touch_user_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_settings_touch_updated_at
  before update on public.user_settings
  for each row execute function public.touch_user_settings();

alter table public.user_settings enable row level security;

create policy "users read own settings"
  on public.user_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "users insert own settings"
  on public.user_settings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update own settings"
  on public.user_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
