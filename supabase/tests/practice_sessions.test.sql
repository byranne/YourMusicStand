-- log_practice_session RPC and the practice_session_songs join table.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev');

insert into public.songs (id, mbid, title, artist, source) values
  ('10000000-0000-0000-0000-000000000001', 'b1a9c0e9-d987-4042-ae91-78d6a3267d69', 'Wonderwall', 'Oasis', 'musicbrainz');

insert into public.user_songs (id, user_id, song_id, status) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
   '10000000-0000-0000-0000-000000000001', 'learning'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b',
   '10000000-0000-0000-0000-000000000001', 'learning');

-- ---------------------------------------------------------------------------
-- As user A
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select lives_ok(
  $$ select public.log_practice_session(
       now(), 1800, 'great',
       array['20000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'A can save a session with their own song'
);
select is(
  (select count(*)::int from public.practice_session_songs
   where user_song_id = '20000000-0000-0000-0000-000000000001'),
  1, 'the session''s song row was saved'
);
select lives_ok(
  $$ select public.log_practice_session(now(), 900, null, '{}'::uuid[]) $$,
  'a session may cover no songs'
);

-- B's user_song is rejected, and the whole session rolls back with it.
select throws_ok(
  $$ select public.log_practice_session(
       now(), 600, 'okay',
       array['20000000-0000-0000-0000-000000000002']::uuid[]) $$,
  '42501', null, 'A cannot save a session on B''s user_song'
);
select is(
  (select count(*)::int from public.practice_sessions), 2,
  'the rejected session left no half-saved row'
);

-- ---------------------------------------------------------------------------
-- Deleting a session: owner only, and its song rows go with it
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
delete from public.practice_sessions;
reset role;
select is(
  (select count(*)::int from public.practice_sessions), 2,
  'B cannot delete A''s sessions'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
delete from public.practice_sessions where duration_min = 15;
select is(
  (select count(*)::int from public.practice_sessions), 1,
  'A can delete their own session'
);
select is(
  (select count(*)::int from public.practice_session_songs), 1,
  'the other session keeps its song row'
);
select lives_ok(
  $$ select public.log_practice_session(now(), 900, null, '{}'::uuid[]) $$,
  'A can log again after deleting'
);

-- ---------------------------------------------------------------------------
-- Seconds are what is stored; minutes are derived from them
-- ---------------------------------------------------------------------------
select public.log_practice_session(now(), 754, null, '{}'::uuid[]);
select public.log_practice_session(now(), 20, null, '{}'::uuid[]);
select is(
  (select duration_min::int from public.practice_sessions where duration_sec = 754),
  13, 'a session keeps its seconds and derives whole minutes'
);
select is(
  (select duration_min::int from public.practice_sessions where duration_sec = 20),
  1, 'a session under a minute still counts as one minute'
);
select throws_ok(
  $$ select public.log_practice_session(now(), 0, null, '{}'::uuid[]) $$,
  '23514', null, 'a session must last at least a second'
);
select throws_ok(
  $$ update public.practice_sessions set duration_min = 99 $$,
  '428C9', null, 'minutes cannot be written directly'
);
delete from public.practice_sessions where duration_sec in (754, 20);

-- Deleting a library entry removes its join rows but keeps the session.
reset role;
delete from public.user_songs where id = '20000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.practice_session_songs)
  || '/' || (select count(*)::int from public.practice_sessions),
  '0/2', 'deleting an entry removes its join rows but keeps the sessions'
);

select * from finish();
rollback;
