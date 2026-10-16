-- Any song in a library can have its own cover image, not only custom songs.
-- Catalog songs are shared, so the picture belongs to the library entry
-- (user_songs) rather than the song: it replaces the Cover Art Archive image
-- for its owner only. The file lives at {user_id}/covers/{random}.jpg in the
-- private 'resources' bucket, like custom covers before it, so the existing
-- storage policies (own folder only, 50 MB per account) still apply.

alter table public.user_songs add column cover_path text;

alter table public.user_songs add constraint user_songs_cover_path_check check (
  cover_path is null
  or (
    starts_with(cover_path, user_id::text || '/covers/')
    and char_length(cover_path) <= 300
  )
);

-- Custom covers move onto their entry. A custom song is private to its
-- creator, so its creator's entry is the only one there is. The trigger is off
-- so the move doesn't bump updated_at and reorder anyone's list.
alter table public.user_songs disable trigger user_songs_before_write;
update public.user_songs us
set cover_path = s.cover_path
from public.songs s
where s.id = us.song_id
  and s.source = 'custom'
  and s.cover_path is not null
  and us.user_id = s.created_by;
alter table public.user_songs enable trigger user_songs_before_write;

-- songs.cover_path is no longer written; it stays (empty) like other retired columns.
update public.songs set cover_path = null where cover_path is not null;
