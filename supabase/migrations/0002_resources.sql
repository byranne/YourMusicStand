-- Resources: the links and uploaded files a user keeps on a library entry.
-- Replaces user_songs.tab_url / video_url. Files live in a private storage bucket.

create type public.resource_kind as enum ('link', 'file');

-- ---------------------------------------------------------------------------
-- resources
-- ---------------------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_song_id uuid not null references public.user_songs (id) on delete cascade,
  kind public.resource_kind not null,
  title text not null check (char_length(title) between 1 and 200),
  -- Links are rendered as <a href>, so only web links: no javascript: or data: URLs.
  url text check (url ~* '^https?://' and char_length(url) <= 2000),
  -- Object name in the 'resources' bucket: {user_id}/{user_song_id}/{random}.{ext}
  storage_path text unique,
  mime_type text check (char_length(mime_type) <= 200),
  size_bytes integer check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  check (
    (kind = 'link' and url is not null and storage_path is null)
    or (
      kind = 'file' and url is null and storage_path is not null
      and starts_with(storage_path, user_id::text || '/')
    )
  )
);

create index resources_user_song_created_idx on public.resources (user_song_id, created_at);
create index resources_user_id_idx on public.resources (user_id);

alter table public.resources enable row level security;

-- Owner-only. There is no update policy: a resource is added or removed, never edited.
create policy "users read own resources"
  on public.resources for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "users insert own resources"
  on public.resources for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.user_songs us
      where us.id = user_song_id and us.user_id = (select auth.uid())
    )
  );

create policy "users delete own resources"
  on public.resources for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Move the old tab/video links into resources, then drop their columns
-- ---------------------------------------------------------------------------
insert into public.resources (user_id, user_song_id, kind, title, url)
select user_id, id, 'link', 'Tab', tab_url
from public.user_songs
where tab_url ~* '^https?://' and char_length(tab_url) <= 2000;

insert into public.resources (user_id, user_song_id, kind, title, url)
select user_id, id, 'link', 'Video', video_url
from public.user_songs
where video_url ~* '^https?://' and char_length(video_url) <= 2000;

alter table public.user_songs
  drop column tab_url,
  drop column video_url;

-- ---------------------------------------------------------------------------
-- Storage: a private bucket, each user confined to their own top-level folder
-- ---------------------------------------------------------------------------
-- No mime allow-list: Guitar Pro files and the like have no standard type.
insert into storage.buckets (id, name, public, file_size_limit)
values ('resources', 'resources', false, 20971520)
on conflict (id) do nothing;

create policy "users read own resource files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users upload own resource files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete own resource files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
