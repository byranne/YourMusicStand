import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { coverPathFor, shrinkCover } from '../covers';
import type { Crop } from '../crop';
import { songsFor, type Jamlist } from '../jamlists';
import { supabase } from '../supabase';
import { removeResourceFiles, signCovers, uploadCover } from './resourceFiles';
import { useSession } from './useSession';

const JAMLIST_SELECT = '*, songs:jamlist_songs(user_song_id, position)';

export const jamlistsKey = (userId: string | undefined) => ['jamlists', userId] as const;

type JamlistRow = Omit<Jamlist, 'cover_url'>;

// A jamlist's own picture is shown through cover_url, a signed URL for its cover_path.
async function withCovers(rows: JamlistRow[]): Promise<Jamlist[]> {
  const paths = rows.flatMap((row) => (row.cover_path ? [row.cover_path] : []));
  // A cover that can't be signed falls back to the songs' covers rather than failing.
  const urls = paths.length > 0 ? await signCovers(paths).catch(() => ({}) as Record<string, string>) : {};
  return rows.map((row) => ({ ...row, cover_url: row.cover_path ? (urls[row.cover_path] ?? null) : null }));
}

// All of the user's jamlists with their songs, loaded once like the library.
export function useJamlists() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: jamlistsKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Jamlist[]> => {
      const { data, error } = await supabase
        .from('jamlists')
        .select(JAMLIST_SELECT)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return withCovers(data);
    },
  });
}

function useJamlistCache() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const key = jamlistsKey(userId);

  const replace = (id: string, next: (jamlist: Jamlist) => Jamlist) =>
    queryClient.setQueryData<Jamlist[]>(key, (lists) => lists?.map((list) => (list.id === id ? next(list) : list)));

  return { queryClient, userId, key, replace };
}

// Creates a jamlist, optionally with songs already in it, and returns it.
export function useCreateJamlist() {
  const { queryClient, userId, key } = useJamlistCache();

  return useMutation({
    mutationFn: async ({ name, entryIds = [] }: { name: string; entryIds?: string[] }): Promise<Jamlist> => {
      if (!userId) throw new Error('You are signed out. Sign in and try again.');
      const { data, error } = await supabase.from('jamlists').insert({ name: name.trim() }).select('*').single();
      if (error) throw error;
      if (entryIds.length > 0) {
        const { error: songsError } = await supabase.rpc('set_jamlist_songs', {
          p_jamlist_id: data.id,
          p_user_song_ids: entryIds,
        });
        if (songsError) throw songsError;
      }
      return { ...data, songs: songsFor(entryIds), cover_url: null };
    },
    onSuccess: (jamlist) => {
      queryClient.setQueryData<Jamlist[]>(key, (lists = []) => [...lists, jamlist]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useRenameJamlist() {
  const { queryClient, key, replace } = useJamlistCache();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('jamlists').update({ name: name.trim() }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Jamlist[]>(key)?.find((list) => list.id === id);
      replace(id, (list) => ({ ...list, name: name.trim() }));
      return { previous };
    },
    onError: (_error, { id }, context) => {
      const previous = context?.previous;
      if (previous) replace(id, () => previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

// The whole song list in its new order: covers adding, removing and reordering.
export function useSetJamlistSongs() {
  const { queryClient, key, replace } = useJamlistCache();

  return useMutation({
    mutationFn: async ({ id, entryIds }: { id: string; entryIds: string[] }) => {
      const { error } = await supabase.rpc('set_jamlist_songs', { p_jamlist_id: id, p_user_song_ids: entryIds });
      if (error) throw error;
    },
    onMutate: async ({ id, entryIds }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Jamlist[]>(key)?.find((list) => list.id === id);
      replace(id, (list) => ({ ...list, songs: songsFor(entryIds) }));
      return { previous };
    },
    onError: (_error, { id }, context) => {
      const previous = context?.previous;
      if (previous) replace(id, () => previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteJamlist() {
  const { queryClient, key } = useJamlistCache();

  return useMutation({
    mutationFn: async (jamlist: Jamlist) => {
      const { error } = await supabase.from('jamlists').delete().eq('id', jamlist.id);
      if (error) throw error;
      // The song rows cascade; the cover file doesn't.
      await removeResourceFiles([{ storage_path: jamlist.cover_path }]);
    },
    onMutate: async (jamlist) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Jamlist[]>(key);
      queryClient.setQueryData<Jamlist[]>(key, (lists) => lists?.filter((list) => list.id !== jamlist.id));
      return { previous };
    },
    onError: (_error, _jamlist, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

// Uploads a picture as the jamlist's cover, replacing any earlier one, or with
// no file goes back to its first song's cover. Same steps as useSetCover.
export function useSetJamlistCover() {
  const { queryClient, userId, key } = useJamlistCache();

  return useMutation({
    mutationFn: async ({ jamlist, image }: { jamlist: Jamlist; image: { file: File; crop: Crop } | null }) => {
      if (!userId) throw new Error('You are signed out. Sign in and try again.');
      let path: string | null = null;
      if (image) {
        const jpeg = await shrinkCover(image.file, { crop: image.crop });
        // Not crypto.randomUUID(): that needs HTTPS, and the dev server is plain HTTP on the LAN.
        path = coverPathFor(userId, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await uploadCover(path, jpeg);
      }

      const { error } = await supabase.from('jamlists').update({ cover_path: path }).eq('id', jamlist.id);
      if (error) {
        if (path) await removeResourceFiles([{ storage_path: path }]);
        throw error;
      }
      if (jamlist.cover_path) await removeResourceFiles([{ storage_path: jamlist.cover_path }]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
