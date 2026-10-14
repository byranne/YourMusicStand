-- Sessions are timed to the second. duration_sec is the stored value;
-- duration_min becomes a generated whole-minute figure, so the two can't disagree.

alter table public.practice_sessions add column duration_sec integer;
update public.practice_sessions set duration_sec = duration_min * 60;

alter table public.practice_sessions
  alter column duration_sec set not null,
  add constraint practice_sessions_duration_sec_check check (duration_sec between 1 and 86400),
  drop column duration_min;

alter table public.practice_sessions
  add column duration_min smallint not null
    generated always as (greatest(1, round(duration_sec / 60.0))::smallint) stored;

-- ---------------------------------------------------------------------------
-- log_practice_session now takes seconds
-- ---------------------------------------------------------------------------
drop function public.log_practice_session(timestamptz, smallint, public.practice_feel, uuid[]);

-- security invoker, so RLS still decides what the caller may insert: another
-- user's user_song_id fails the join-table policy and rolls everything back.
create function public.log_practice_session(
  p_practiced_at timestamptz,
  p_duration_sec integer,
  p_feel public.practice_feel,
  p_user_song_ids uuid[]
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  insert into public.practice_sessions (practiced_at, duration_sec, feel)
  values (p_practiced_at, p_duration_sec, p_feel)
  returning id into v_session_id;

  insert into public.practice_session_songs (session_id, user_song_id)
  select v_session_id, song_id
  from (select distinct unnest(coalesce(p_user_song_ids, '{}')) as song_id) songs;

  return v_session_id;
end;
$$;

revoke execute on function public.log_practice_session(timestamptz, integer, public.practice_feel, uuid[])
  from public, anon;
grant execute on function public.log_practice_session(timestamptz, integer, public.practice_feel, uuid[])
  to authenticated;
