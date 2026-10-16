-- Avatars on profiles and the private user_settings table.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser, bypassing RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev');

insert into public.user_settings (user_id, weekly_goal_min, background) values
  ('00000000-0000-0000-0000-00000000000a', 120, 'dots');

-- ---------------------------------------------------------------------------
-- Schema integrity
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update public.profiles set avatar_preset = 'banjo' where id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'an avatar preset must be a known one'
);
select throws_ok(
  $$ update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000000b/avatar/x.jpg'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'an avatar path must sit in its owner''s avatar folder'
);
select throws_ok(
  $$ update public.user_settings set weekly_goal_min = 5 where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'a weekly goal must be at least 10 minutes'
);
select throws_ok(
  $$ update public.user_settings set background = 'plaid' where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'a background must be a known one'
);

-- ---------------------------------------------------------------------------
-- As user A: can set their own avatar and settings
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select lives_ok(
  $$ update public.profiles set avatar_preset = 'guitar', avatar_path = '00000000-0000-0000-0000-00000000000a/avatar/a.jpg'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  'A can set their own avatar'
);
select lives_ok(
  $$ update public.user_settings set weekly_goal_min = 90 where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'A can update their own settings'
);

-- ---------------------------------------------------------------------------
-- As user B: cannot see or touch A's settings or avatar
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.user_settings),
  0, 'B cannot read A''s settings'
);
select throws_ok(
  $$ insert into public.user_settings (user_id, background) values ('00000000-0000-0000-0000-00000000000a', 'wash') $$,
  '42501', null, 'B cannot insert settings for A'
);

update public.user_settings set background = 'wash' where user_id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set avatar_preset = 'drum' where id = '00000000-0000-0000-0000-00000000000a';

reset role;
select is(
  (select background from public.user_settings where user_id = '00000000-0000-0000-0000-00000000000a'),
  'dots', 'B''s update did not change A''s settings'
);
select is(
  (select avatar_preset from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'guitar', 'B''s update did not change A''s avatar'
);

select * from finish();
rollback;
