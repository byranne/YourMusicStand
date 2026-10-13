-- RLS + schema tests. Run with `supabase test db` (needs the Supabase CLI + Docker).
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser, bypassing RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev');

select is(
  (select count(*)::int from public.profiles
   where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')),
  2,
  'signup trigger creates a profile per user (anonymous users included)'
);

insert into public.songs (id, mbid, title, artist, source) values
  ('10000000-0000-0000-0000-000000000001', 'b1a9c0e9-d987-4042-ae91-78d6a3267d69', 'Wonderwall', 'Oasis', 'musicbrainz');

insert into public.songs (id, title, artist, source, created_by) values
  ('10000000-0000-0000-0000-000000000002', 'A''s Riff', 'A', 'custom', '00000000-0000-0000-0000-00000000000a');

insert into public.user_songs (id, user_id, song_id, status) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
   '10000000-0000-0000-0000-000000000001', 'learning');

insert into public.practice_sessions (id, user_id, duration_sec) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 1200);

insert into public.practice_session_songs (session_id, user_song_id, user_id) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a');

-- ---------------------------------------------------------------------------
-- Schema integrity
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.user_songs (user_id, song_id) values
     ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001') $$,
  '23505', null, 'unique(user_id, song_id)'
);
select throws_ok(
  $$ update public.user_songs set progress = 101 where id = '20000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'progress must be 0-100'
);
select throws_ok(
  $$ update public.user_songs set difficulty = 6 where id = '20000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'difficulty must be 1-5'
);
select throws_ok(
  $$ insert into public.songs (title, artist, source) values ('x', 'y', 'musicbrainz') $$,
  '23514', null, 'musicbrainz songs need an mbid'
);
select throws_ok(
  $$ insert into public.songs (title, artist, source) values ('x', 'y', 'custom') $$,
  '23514', null, 'custom songs need created_by'
);

-- learned_at trigger
update public.user_songs set status = 'learned' where id = '20000000-0000-0000-0000-000000000001';
select isnt(
  (select learned_at from public.user_songs where id = '20000000-0000-0000-0000-000000000001'),
  null, 'learned_at is set when status becomes learned'
);
update public.user_songs set status = 'learning' where id = '20000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- As user B
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is((select count(*)::int from public.user_songs), 0, 'B cannot read A''s user_songs');
select is((select count(*)::int from public.practice_sessions), 0, 'B cannot read A''s practice_sessions');
select is((select count(*)::int from public.practice_session_songs), 0, 'B cannot read A''s practice_session_songs');

select is(
  (select count(*)::int from public.songs where id = '10000000-0000-0000-0000-000000000001'),
  1, 'B can read MusicBrainz songs'
);
select is(
  (select count(*)::int from public.songs where id = '10000000-0000-0000-0000-000000000002'),
  0, 'B cannot read A''s custom song'
);

select throws_ok(
  $$ insert into public.user_songs (user_id, song_id) values
     ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'B cannot insert user_songs for A'
);
select throws_ok(
  $$ insert into public.user_songs (song_id) values ('10000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'B cannot add A''s custom song to their library'
);
select throws_ok(
  $$ insert into public.practice_session_songs (session_id, user_song_id) values
     ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'B cannot attach a song to A''s session'
);

update public.user_songs set progress = 99 where id = '20000000-0000-0000-0000-000000000001';
delete from public.user_songs where id = '20000000-0000-0000-0000-000000000001';
delete from public.practice_sessions where id = '30000000-0000-0000-0000-000000000001';
delete from public.practice_session_songs where session_id = '30000000-0000-0000-0000-000000000001';
delete from public.songs where id = '10000000-0000-0000-0000-000000000002';

select throws_ok(
  $$ insert into public.songs (mbid, title, artist, source) values
     ('c1a9c0e9-d987-4042-ae91-78d6a3267d69', 'Fake', 'Fake', 'musicbrainz') $$,
  '42501', null, 'clients cannot insert musicbrainz songs'
);
select throws_ok(
  $$ insert into public.songs (title, artist, source, created_by) values
     ('Mine?', 'B', 'custom', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'clients cannot insert custom songs attributed to someone else'
);
select lives_ok(
  $$ insert into public.songs (title, artist, source, created_by) values
     ('B''s Riff', 'B', 'custom', '00000000-0000-0000-0000-00000000000b') $$,
  'B can insert their own custom song'
);

reset role;

-- B's updates/deletes above silently matched zero rows; confirm A's data is intact.
select is(
  (select progress::int from public.user_songs where id = '20000000-0000-0000-0000-000000000001'),
  0, 'B''s update did not touch A''s user_song'
);
select is(
  (select count(*)::int from public.practice_sessions where id = '30000000-0000-0000-0000-000000000001'),
  1, 'B''s delete did not remove A''s practice_session'
);
select is(
  (select count(*)::int from public.practice_session_songs
   where session_id = '30000000-0000-0000-0000-000000000001'),
  1, 'B''s delete did not remove A''s practice_session_songs'
);
select is(
  (select count(*)::int from public.songs where id = '10000000-0000-0000-0000-000000000002'),
  1, 'B''s delete did not remove A''s custom song'
);

-- profiles: public read, owner-only write
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
update public.profiles set display_name = 'hacked' where id = '00000000-0000-0000-0000-00000000000a';
reset role;
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  null, 'B cannot update A''s profile'
);

-- Account deletion cascades custom songs.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select count(*)::int from public.songs where id = '10000000-0000-0000-0000-000000000002'),
  0, 'deleting a user deletes their custom songs'
);

select * from finish();
rollback;
