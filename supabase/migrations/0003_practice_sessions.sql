-- Practice sessions: one sitting that can cover several songs.
-- practice_sessions was never written to, so reshaping it loses nothing.

create type public.practice_feel as enum ('rough', 'okay', 'great');

-- The old policies reference user_song_id, so they go before the column does.
drop policy "users insert own sessions" on public.practice_sessions;
drop policy "users update own sessions" on public.practice_sessions;

drop index public.practice_sessions_user_song_idx;
alter table public.practice_sessions
  drop column user_song_id,
  drop column focus,
  drop column progress_after,
  add column feel public.practice_feel;
drop type public.practice_focus;

create policy "users insert own sessions"
  on public.practice_sessions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update own sessions"
  on public.practice_sessions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- practice_session_songs: which library entries a session covered
-- ---------------------------------------------------------------------------
create table public.practice_session_songs (
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  user_song_id uuid not null references public.user_songs (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (session_id, user_song_id)
);

create index practice_session_songs_user_song_idx
  on public.practice_session_songs (user_song_id);

alter table public.practice_session_songs enable row level security;

create policy "users read own session songs"
  on public.practice_session_songs for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "users insert own session songs"
  on public.practice_session_songs for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.practice_sessions ps
      where ps.id = session_id and ps.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.user_songs us
      where us.id = user_song_id and us.user_id = (select auth.uid())
    )
  );

create policy "users delete own session songs"
  on public.practice_session_songs for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- log_practice_session: the session and its songs in one transaction
-- ---------------------------------------------------------------------------
-- security invoker, so RLS still decides what the caller may insert: another
-- user's user_song_id fails the join-table policy and rolls everything back.
create function public.log_practice_session(
  p_practiced_at timestamptz,
  p_duration_min smallint,
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
  insert into public.practice_sessions (practiced_at, duration_min, feel)
  values (p_practiced_at, p_duration_min, p_feel)
  returning id into v_session_id;

  insert into public.practice_session_songs (session_id, user_song_id)
  select v_session_id, song_id
  from (select distinct unnest(coalesce(p_user_song_ids, '{}')) as song_id) songs;

  return v_session_id;
end;
$$;

revoke execute on function public.log_practice_session(timestamptz, smallint, public.practice_feel, uuid[])
  from public, anon;
grant execute on function public.log_practice_session(timestamptz, smallint, public.practice_feel, uuid[])
  to authenticated;
