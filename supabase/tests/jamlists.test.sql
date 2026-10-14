-- Jamlists, their songs, and the set_jamlist_songs RPC.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser, bypassing RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev');

insert into public.songs (id, mbid, title, artist, source) values
  ('10000000-0000-0000-0000-000000000001', 'b1a9c0e9-d987-4042-ae91-78d6a3267d69', 'Wonderwall', 'Oasis', 'musicbrainz'),
  ('10000000-0000-0000-0000-000000000002', 'c1a9c0e9-d987-4042-ae91-78d6a3267d69', 'Blackbird', 'The Beatles', 'musicbrainz');

insert into public.user_songs (id, user_id, song_id, status) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
   '10000000-0000-0000-0000-000000000001', 'learning'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
   '10000000-0000-0000-0000-000000000002', 'learned'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000b',
   '10000000-0000-0000-0000-000000000001', 'learning');

insert into public.jamlists (id, user_id, name) values
  ('30000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'B''s set');

-- ---------------------------------------------------------------------------
-- Schema integrity
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.jamlists (user_id, name) values ('00000000-0000-0000-0000-00000000000a', '   ') $$,
  '23514', null, 'a jamlist needs a name'
);
select throws_ok(
  $$ insert into public.jamlists (user_id, name, cover_path)
     values ('00000000-0000-0000-0000-00000000000a', 'X', '00000000-0000-0000-0000-00000000000b/covers/x.jpg') $$,
  '23514', null, 'a jamlist cover must sit in its owner''s covers folder'
);

-- ---------------------------------------------------------------------------
-- As user A
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.jamlists (id, name, cover_path)
     values ('30000000-0000-0000-0000-00000000000a', 'Campfire', '00000000-0000-0000-0000-00000000000a/covers/c.jpg') $$,
  'A can create a jamlist'
);
select lives_ok(
  $$ select public.set_jamlist_songs('30000000-0000-0000-0000-00000000000a',
       array['20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
             '20000000-0000-0000-0000-000000000002']::uuid[]) $$,
  'A can set their jamlist''s songs'
);
select results_eq(
  $$ select user_song_id::text, position from public.jamlist_songs
     where jamlist_id = '30000000-0000-0000-0000-00000000000a' order by position $$,
  $$ values ('20000000-0000-0000-0000-000000000002', 0), ('20000000-0000-0000-0000-000000000001', 1) $$,
  'songs keep the given order, and a repeat keeps its first place'
);
select lives_ok(
  $$ select public.set_jamlist_songs('30000000-0000-0000-0000-00000000000a',
       array['20000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'A can rewrite the list'
);
select is(
  (select count(*)::int from public.jamlist_songs where jamlist_id = '30000000-0000-0000-0000-00000000000a'),
  1, 'rewriting replaces the old rows'
);

-- B's entry is rejected and the rewrite rolls back with it.
select throws_ok(
  $$ select public.set_jamlist_songs('30000000-0000-0000-0000-00000000000a',
       array['20000000-0000-0000-0000-000000000003']::uuid[]) $$,
  '42501', null, 'A cannot put B''s entry in a jamlist'
);
select is(
  (select count(*)::int from public.jamlist_songs where jamlist_id = '30000000-0000-0000-0000-00000000000a'),
  1, 'the failed rewrite left the list as it was'
);
select throws_ok(
  $$ select public.set_jamlist_songs('30000000-0000-0000-0000-00000000000b',
       array['20000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'P0002', null, 'A cannot fill B''s jamlist'
);
select throws_ok(
  $$ insert into public.jamlist_songs (jamlist_id, user_song_id, position)
     values ('30000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 0) $$,
  '42501', null, 'A cannot insert into B''s jamlist directly'
);
select is(
  (select count(*)::int from public.jamlists), 1, 'A sees only their own jamlist'
);
select lives_ok(
  $$ update public.jamlists set name = 'Campfire set' where id = '30000000-0000-0000-0000-00000000000a' $$,
  'A can rename their jamlist'
);

-- ---------------------------------------------------------------------------
-- As user B: can't see or change A's jamlist
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.jamlist_songs), 0, 'B cannot see A''s jamlist songs'
);
update public.jamlists set name = 'Hacked' where id = '30000000-0000-0000-0000-00000000000a';
delete from public.jamlists where id = '30000000-0000-0000-0000-00000000000a';

reset role;
select is(
  (select name from public.jamlists where id = '30000000-0000-0000-0000-00000000000a'),
  'Campfire set', 'B cannot rename or delete A''s jamlist'
);

-- ---------------------------------------------------------------------------
-- Cascades
-- ---------------------------------------------------------------------------
delete from public.user_songs where id = '20000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.jamlist_songs where jamlist_id = '30000000-0000-0000-0000-00000000000a'),
  0, 'removing an entry takes it out of its jamlists'
);
delete from public.jamlists where id = '30000000-0000-0000-0000-00000000000a';
select is(
  (select count(*)::int from public.jamlists where id = '30000000-0000-0000-0000-00000000000a'),
  0, 'a jamlist can be deleted'
);

select * from finish();
rollback;
