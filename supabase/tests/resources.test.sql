-- Resources (links + files on a library entry) and the 'resources' storage bucket.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser, bypassing RLS)
-- ---------------------------------------------------------------------------
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

insert into public.resources (id, user_id, user_song_id, kind, title, url) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
   '20000000-0000-0000-0000-000000000001', 'link', 'Tab', 'https://example.com/tab');

insert into public.resources (id, user_id, user_song_id, kind, title, storage_path) values
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
   '20000000-0000-0000-0000-000000000001', 'file', 'solo.pdf',
   '00000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/solo.pdf');

-- A's one file fills the whole 50 MB allowance.
insert into storage.objects (bucket_id, name, metadata) values
  ('resources', '00000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/solo.pdf',
   '{"size": 52428800}');

-- ---------------------------------------------------------------------------
-- Schema integrity
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.resources (user_id, user_song_id, kind, title, url) values
     ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001',
      'link', 'x', 'javascript:alert(1)') $$,
  '23514', null, 'links must be http(s)'
);
select throws_ok(
  $$ insert into public.resources (user_id, user_song_id, kind, title) values
     ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'link', 'x') $$,
  '23514', null, 'a link needs a url'
);
select throws_ok(
  $$ insert into public.resources (user_id, user_song_id, kind, title, url, storage_path) values
     ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'file', 'x',
      'https://example.com', '00000000-0000-0000-0000-00000000000a/x') $$,
  '23514', null, 'a file has no url'
);
select throws_ok(
  $$ insert into public.resources (user_id, user_song_id, kind, title, storage_path) values
     ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'file', 'x',
      '00000000-0000-0000-0000-00000000000b/x.pdf') $$,
  '23514', null, 'a file path must sit in its owner''s folder'
);
select throws_ok(
  $$ insert into public.resources (user_id, user_song_id, kind, title, url) values
     ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001',
      'link', '', 'https://example.com') $$,
  '23514', null, 'a resource needs a title'
);
select is(
  (select public::text || ' ' || file_size_limit from storage.buckets where id = 'resources'),
  'false 20971520', 'the resources bucket is private with a 20 MB file limit'
);

-- ---------------------------------------------------------------------------
-- As user B
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is((select count(*)::int from public.resources), 0, 'B cannot read A''s resources');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'resources'),
  0, 'B cannot read A''s files'
);

select throws_ok(
  $$ insert into public.resources (user_song_id, kind, title, url) values
     ('20000000-0000-0000-0000-000000000001', 'link', 'x', 'https://example.com') $$,
  '42501', null, 'B cannot attach a resource to A''s song'
);
select throws_ok(
  $$ insert into public.resources (user_id, user_song_id, kind, title, url) values
     ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000002',
      'link', 'x', 'https://example.com') $$,
  '42501', null, 'B cannot insert a resource owned by A'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values
     ('resources', '00000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/evil.pdf') $$,
  '42501', null, 'B cannot upload into A''s folder'
);

select lives_ok(
  $$ insert into public.resources (id, user_song_id, kind, title, url) values
     ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
      'link', 'Lesson', 'https://example.com/lesson') $$,
  'B can add a link to their own song'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values
     ('resources', '00000000-0000-0000-0000-00000000000b/20000000-0000-0000-0000-000000000002/mine.pdf') $$,
  'B can upload into their own folder: A''s usage does not count against B'
);

-- Silently match zero rows: A's row is invisible, and nobody may update.
delete from public.resources where id = '40000000-0000-0000-0000-000000000001';
update public.resources set title = 'Renamed' where id = '40000000-0000-0000-0000-000000000003';

reset role;

-- ---------------------------------------------------------------------------
-- As user A: the upload allowance
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is(public.resource_bytes_used(), 52428800::bigint, 'A''s stored bytes are counted');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values
     ('resources', '00000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/more.pdf') $$,
  '42501', null, 'A cannot upload once the allowance is used up'
);

reset role;
update storage.objects set metadata = '{"size": 52428799}'
  where name = '00000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/solo.pdf';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values
     ('resources', '00000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/more.pdf') $$,
  'A can upload while under the allowance'
);

reset role;

select throws_ok(
  $$ set local role anon; select public.resource_bytes_used() $$,
  '42501', null, 'anon cannot call resource_bytes_used()'
);
reset role;

select is(
  (select count(*)::int from public.resources where user_id = '00000000-0000-0000-0000-00000000000a'),
  2, 'B''s delete did not remove A''s resource'
);
select is(
  (select title from public.resources where id = '40000000-0000-0000-0000-000000000003'),
  'Lesson', 'resources cannot be updated, even by their owner'
);

-- Resources go with their library entry.
delete from public.user_songs where id = '20000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.resources where user_id = '00000000-0000-0000-0000-00000000000a'),
  0, 'deleting a library entry deletes its resources'
);
select is(
  (select count(*)::int from public.resources where user_id = '00000000-0000-0000-0000-00000000000b'),
  1, 'and leaves other users'' resources alone'
);

select * from finish();
rollback;
