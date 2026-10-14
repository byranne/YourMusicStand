-- Custom songs can have a cover image the user uploads. The image lives in the
-- private 'resources' bucket at {user_id}/covers/{random}.jpg, so the existing
-- storage policies (own folder only, 50 MB per account) already cover it.
-- MusicBrainz songs keep using Cover Art Archive URLs in cover_url.

alter table public.songs add column cover_path text;

alter table public.songs add constraint songs_cover_path_check check (
  cover_path is null
  or (
    source = 'custom'
    and starts_with(cover_path, created_by::text || '/covers/')
    and char_length(cover_path) <= 300
  )
);
