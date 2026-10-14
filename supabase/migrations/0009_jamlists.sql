-- Jamlists: named, ordered groups of a user's library entries ("Campfire set",
-- "Warm-ups"). An entry can be in any number of them. Owner-only, like the rest
-- of a user's data.

-- ---------------------------------------------------------------------------
-- jamlists
-- ---------------------------------------------------------------------------
-- cover_path is an optional picture of the user's own, at
-- {user_id}/covers/{random}.jpg in the private 'resources' bucket like entry
-- covers (0008), so the storage policies (own folder, 50 MB) already apply.
-- Without one, the app shows the first song's cover.
create table public.jamlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    cover_path is null
    or (starts_with(cover_path, user_id::text || '/covers/') and char_length(cover_path) <= 300)
  )
);

create index jamlists_user_id_idx on public.jamlists (user_id);

create function public.touch_jamlist()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger jamlists_touch_updated_at
  before update on public.jamlists
  for each row execute function public.touch_jamlist();

alter table public.jamlists enable row level security;

create policy "users read own jamlists"
  on public.jamlists for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "users insert own jamlists"
  on public.jamlists for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update own jamlists"
  on public.jamlists for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users delete own jamlists"
  on public.jamlists for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- jamlist_songs: which entries a jamlist holds, in order
-- ---------------------------------------------------------------------------
-- Cascades with both sides: deleting an entry takes it out of its jamlists.
-- No update policy: set_jamlist_songs rewrites a jamlist's rows instead.
create table public.jamlist_songs (
  jamlist_id uuid not null references public.jamlists (id) on delete cascade,
  user_song_id uuid not null references public.user_songs (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null check (position >= 0),
  primary key (jamlist_id, user_song_id)
);

create index jamlist_songs_user_song_idx on public.jamlist_songs (user_song_id);
create index jamlist_songs_user_id_idx on public.jamlist_songs (user_id);

alter table public.jamlist_songs enable row level security;

create policy "users read own jamlist songs"
  on public.jamlist_songs for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "users insert own jamlist songs"
  on public.jamlist_songs for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.jamlists j
      where j.id = jamlist_id and j.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.user_songs us
      where us.id = user_song_id and us.user_id = (select auth.uid())
    )
  );

create policy "users delete own jamlist songs"
  on public.jamlist_songs for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- set_jamlist_songs: a jamlist's whole song list, in order, in one transaction
-- ---------------------------------------------------------------------------
-- Adding, removing and reordering are all "here is the new list". security
-- invoker, so RLS decides: another user's jamlist or entry fails a policy and
-- rolls everything back.
create function public.set_jamlist_songs(p_jamlist_id uuid, p_user_song_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Also bumps updated_at, and makes an unknown or foreign jamlist an error
  -- rather than a silent no-op.
  update public.jamlists set updated_at = now() where id = p_jamlist_id;
  if not found then
    raise exception 'jamlist not found' using errcode = 'P0002';
  end if;

  delete from public.jamlist_songs where jamlist_id = p_jamlist_id;

  -- A repeated id keeps its first position.
  insert into public.jamlist_songs (jamlist_id, user_song_id, position)
  select p_jamlist_id, song_id, (min(ord) - 1)::integer
  from unnest(coalesce(p_user_song_ids, '{}')) with ordinality as ids (song_id, ord)
  group by song_id;
end;
$$;

revoke execute on function public.set_jamlist_songs(uuid, uuid[]) from public, anon;
grant execute on function public.set_jamlist_songs(uuid, uuid[]) to authenticated;
