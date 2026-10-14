import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PracticeFeel } from '../database.types';
import type { PracticeSession } from '../stats';
import { supabase } from '../supabase';
import { useSession } from './useSession';

const SESSION_SELECT = '*, songs:practice_session_songs(user_song_id)';

export const sessionsKey = (userId: string | undefined) => ['sessions', userId] as const;

// All of the user's sessions with the songs each covered, in one snapshot
// (it is small). Stats are computed from this on the client.
export function useSessions() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: sessionsKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<PracticeSession[]> => {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select(SESSION_SELECT)
        .order('practiced_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type SaveSessionInput = {
  practicedAt: string;
  durationSec: number;
  feel: PracticeFeel | null;
  // Real library entry ids (not optimistic pending ones).
  userSongIds: string[];
};

// The session and its songs are saved by one RPC, so a failure can't leave a
// session without its songs.
export function useSaveSession() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const key = sessionsKey(userId);

  return useMutation({
    mutationFn: async (input: SaveSessionInput) => {
      const { data, error } = await supabase.rpc('log_practice_session', {
        p_practiced_at: input.practicedAt,
        p_duration_sec: input.durationSec,
        p_feel: input.feel,
        p_user_song_ids: input.userSongIds,
      });
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      if (!userId) return undefined;
      await queryClient.cancelQueries({ queryKey: key });
      // Not crypto.randomUUID(): that needs HTTPS, and the dev server is plain HTTP on the LAN.
      const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const pending: PracticeSession = {
        id: pendingId,
        user_id: userId,
        practiced_at: input.practicedAt,
        duration_sec: input.durationSec,
        // What the database will generate.
        duration_min: Math.max(1, Math.round(input.durationSec / 60)),
        feel: input.feel,
        notes: null,
        created_at: new Date().toISOString(),
        songs: input.userSongIds.map((user_song_id) => ({ user_song_id })),
      };
      queryClient.setQueryData<PracticeSession[]>(key, (sessions = []) => [pending, ...sessions]);
      return { pendingId };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData<PracticeSession[]>(key, (sessions) =>
        sessions?.filter((entry) => entry.id !== context?.pendingId),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

// Removes a session; its song rows cascade with it.
export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const key = sessionsKey(session?.user.id);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('practice_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PracticeSession[]>(key);
      queryClient.setQueryData<PracticeSession[]>(key, (sessions) => sessions?.filter((entry) => entry.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
