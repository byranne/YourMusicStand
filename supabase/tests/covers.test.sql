-- Uploaded covers on custom songs (songs.cover_path).
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser, bypassing RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev');

insert into public.songs (id, mbid, title, artist, source) values
  ('10000000-0000-0000-0000-000000000001', 'b1a9c0e9-d987-4042-ae91-78d6a3267d69', 'Wonderwall', 'Oasis', 'musicbrainz');

insert into public.songs (id, title, artist, source, created_by) values
  ('10000000-0000-0000-0000-000000000002', 'My Song', 'Me', 'custom', '00000000-0000-0000-0000-00000000000a');

-- ---------------------------------------------------------------------------
-- Schema integrity
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update public.songs set cover_path = '00000000-0000-0000-0000-00000000000a/covers/x.jpg'
     where id = '10000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'MusicBrainz songs cannot have an uploaded cover'
);
select throws_ok(
  $$ update public.songs set cover_path = '00000000-0000-0000-0000-00000000000b/covers/x.jpg'
     where id = '10000000-0000-0000-0000-000000000002' $$,
  '23514', null, 'a cover path must sit in its creator''s covers folder'
);
select throws_ok(
  $$ update public.songs set cover_path = '00000000-0000-0000-0000-00000000000a/20000000/x.jpg'
     where id = '10000000-0000-0000-0000-000000000002' $$,
  '23514', null, 'a cover path must be under covers/'
);

-- ---------------------------------------------------------------------------
-- As user A: can set a cover on their own custom song
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select lives_ok(
  $$ update public.songs set cover_path = '00000000-0000-0000-0000-00000000000a/covers/a.jpg'
     where id = '10000000-0000-0000-0000-000000000002' $$,
  'A can set a cover on their own custom song'
);

-- ---------------------------------------------------------------------------
-- As user B: cannot touch A's cover
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

update public.songs set cover_path = null where id = '10000000-0000-0000-0000-000000000002';
select is(
  (select count(*)::int from public.songs where id = '10000000-0000-0000-0000-000000000002'),
  0, 'B cannot see A''s custom song or its cover path'
);

reset role;
select is(
  (select cover_path from public.songs where id = '10000000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-00000000000a/covers/a.jpg', 'B''s update did not clear A''s cover'
);

select * from finish();
rollback;
