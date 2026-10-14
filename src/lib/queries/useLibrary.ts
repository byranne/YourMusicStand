import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SongStatus, Tables } from '../database.types';
import { defaultsForStatus, type LibraryEntry, type SongCandidate } from '../library';
import { supabase } from '../supabase';
import { removeResourceFiles } from './resourceFiles';
import { useSession } from './useSession';

const ENTRY_SELECT = '*, song:songs(*), resources(*)';
const PENDING_PREFIX = 'pending-';

export const libraryKey = (userId: string | undefined) => ['library', userId] as const;

export type EntryPatch = Partial<Pick<Tables<'user_songs'>, 'status' | 'progress' | 'notes'>>;

// An entry that was added optimistically and has no row id yet, so it can't be edited.
export function isPendingEntry(entry: LibraryEntry): boolean {
  return entry.id.startsWith(PENDING_PREFIX);
}

// The user's whole library in one snapshot (it is small). Filter, sort and
// compute on the client. RLS limits the rows to the signed-in user.
export function useLibrary() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: libraryKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<LibraryEntry[]> => {
      const { data, error } = await supabase
        .from('user_songs')
        .select(ENTRY_SELECT)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Catalog songs go through the RPC (clients can't insert them); custom songs are
// inserted directly and stay private to their creator.
async function ensureSong(candidate: SongCandidate, userId: string): Promise<string> {
  if (candidate.source === 'musicbrainz') {
    const { data, error } = await supabase.rpc('add_musicbrainz_song', {
      p_mbid: candidate.mbid,
      p_title: candidate.title,
      p_artist: candidate.artist,
      p_album: candidate.album,
      p_cover_url: candidate.coverUrl,
      p_duration_ms: candidate.durationMs,
    });
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('songs')
    .insert({ title: candidate.title, artist: candidate.artist, source: 'custom', created_by: userId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

function pendingEntry(candidate: SongCandidate, status: SongStatus, userId: string): LibraryEntry {
  // Not crypto.randomUUID(): that needs HTTPS, and the dev server is plain HTTP on the LAN.
  const id = `${PENDING_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  const catalog = candidate.source === 'musicbrainz' ? candidate : null;

  return {
    id,
    user_id: userId,
    song_id: id,
    status,
    progress: 0,
    difficulty: null,
    tuning: null,
    capo: null,
    notes: null,
    started_at: null,
    learned_at: null,
    created_at: now,
    updated_at: now,
    ...defaultsForStatus(status),
    resources: [],
    song: {
      id,
      mbid: catalog?.mbid ?? null,
      title: candidate.title,
      artist: candidate.artist,
      album: catalog?.album ?? null,
      cover_url: catalog?.coverUrl ?? null,
      duration_ms: catalog?.durationMs ?? null,
      source: candidate.source,
      created_by: catalog ? null : userId,
      created_at: now,
    },
  };
}

// The single way a song enters the library, whatever produced the candidate.
// Logging a song that is already there just updates its status.
export function useLogSong() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const key = libraryKey(userId);

  return useMutation({
    mutationFn: async ({ candidate, status }: { candidate: SongCandidate; status: SongStatus }) => {
      if (!userId) throw new Error('You are signed out. Sign in and try again.');
      const songId = await ensureSong(candidate, userId);

      const { data, error } = await supabase
        .from('user_songs')
        .upsert(
          { user_id: userId, song_id: songId, status, ...defaultsForStatus(status) },
          { onConflict: 'user_id,song_id' },
        )
        .select(ENTRY_SELECT)
        .single();
      if (error) throw error;
      return data satisfies LibraryEntry;
    },
    onMutate: async ({ candidate, status }) => {
      if (!userId) return undefined;
      await queryClient.cancelQueries({ queryKey: key });
      const pending = pendingEntry(candidate, status, userId);
      queryClient.setQueryData<LibraryEntry[]>(key, (entries = []) => [pending, ...entries]);
      return { pendingId: pending.id };
    },
    onSuccess: (entry, _variables, context) => {
      queryClient.setQueryData<LibraryEntry[]>(key, (entries = []) => [
        entry,
        ...entries.filter((other) => other.id !== context?.pendingId && other.id !== entry.id),
      ]);
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData<LibraryEntry[]>(key, (entries) =>
        entries?.filter((entry) => entry.id !== context?.pendingId),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const key = libraryKey(session?.user.id);

  const replace = (id: string, next: (entry: LibraryEntry) => LibraryEntry) =>
    queryClient.setQueryData<LibraryEntry[]>(key, (entries) =>
      entries?.map((entry) => (entry.id === id ? next(entry) : entry)),
    );

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: EntryPatch }) => {
      const { data, error } = await supabase
        .from('user_songs')
        .update(patch)
        .eq('id', id)
        .select(ENTRY_SELECT)
        .single();
      if (error) throw error;
      return data satisfies LibraryEntry;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LibraryEntry[]>(key)?.find((entry) => entry.id === id);
      replace(id, (entry) => ({ ...entry, ...patch }));
      return { previous };
    },
    onSuccess: (entry) => replace(entry.id, () => entry),
    onError: (_error, { id }, context) => {
      const previous = context?.previous;
      if (previous) replace(id, () => previous);
    },
  });
}

export function useRemoveEntry() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const key = libraryKey(session?.user.id);

  return useMutation({
    mutationFn: async (entry: LibraryEntry) => {
      // A custom song exists only for this entry, so delete the song itself
      // (the entry goes with it); a catalog song stays for everyone else.
      const { error } =
        entry.song.source === 'custom'
          ? await supabase.from('songs').delete().eq('id', entry.song_id)
          : await supabase.from('user_songs').delete().eq('id', entry.id);
      if (error) throw error;
      // The resource rows cascade with the entry; their files don't.
      await removeResourceFiles(entry.resources);
    },
    onMutate: async (entry) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LibraryEntry[]>(key);
      queryClient.setQueryData<LibraryEntry[]>(key, (entries) =>
        entries?.filter((other) => other.id !== entry.id),
      );
      return { previous };
    },
    onError: (_error, _entry, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
