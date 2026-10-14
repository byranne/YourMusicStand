import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LibraryEntry } from '../library';
import { fileTitle, linkTitle, storagePathFor, type Resource } from '../resources';
import { supabase } from '../supabase';
import { removeResourceFiles, signResourceFiles, SIGNED_URL_SECONDS, uploadResourceFile } from './resourceFiles';
import { libraryKey } from './useLibrary';
import { useSession } from './useSession';

// Resources live on their library entry in the library cache.
function useEntryResources() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const key = libraryKey(userId);

  const setResources = (entryId: string, next: (resources: Resource[]) => Resource[]) =>
    queryClient.setQueryData<LibraryEntry[]>(key, (entries) =>
      entries?.map((entry) => (entry.id === entryId ? { ...entry, resources: next(entry.resources) } : entry)),
    );
  const add = (resource: Resource) =>
    setResources(resource.user_song_id, (resources) => [
      ...resources.filter((other) => other.id !== resource.id),
      resource,
    ]);

  return { queryClient, key, userId, setResources, add };
}

export function useAddLink() {
  const { add } = useEntryResources();

  return useMutation({
    mutationFn: async ({ entryId, url }: { entryId: string; url: string }) => {
      const { data, error } = await supabase
        .from('resources')
        .insert({ user_song_id: entryId, kind: 'link', title: linkTitle(url), url })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: add,
  });
}

export function useAddFile() {
  const { add, userId } = useEntryResources();

  return useMutation({
    mutationFn: async ({ entryId, file }: { entryId: string; file: File }) => {
      if (!userId) throw new Error('You are signed out. Sign in and try again.');
      // Not crypto.randomUUID(): that needs HTTPS, and the dev server is plain HTTP on the LAN.
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = storagePathFor(userId, entryId, file.name, uniqueId);
      await uploadResourceFile(path, file);

      const { data, error } = await supabase
        .from('resources')
        .insert({
          user_song_id: entryId,
          kind: 'file',
          title: fileTitle(file.name),
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
        })
        .select()
        .single();
      if (error) {
        await removeResourceFiles([{ storage_path: path }]);
        throw error;
      }
      return data;
    },
    onSuccess: add,
  });
}

export function useRemoveResource() {
  const { queryClient, key, setResources } = useEntryResources();

  return useMutation({
    mutationFn: async (resource: Resource) => {
      const { error } = await supabase.from('resources').delete().eq('id', resource.id);
      if (error) throw error;
      await removeResourceFiles([resource]);
    },
    onMutate: async (resource) => {
      await queryClient.cancelQueries({ queryKey: key });
      setResources(resource.user_song_id, (resources) => resources.filter((other) => other.id !== resource.id));
    },
    onError: (_error, resource) =>
      setResources(resource.user_song_id, (resources) =>
        resources.some((other) => other.id === resource.id) ? resources : [...resources, resource],
      ),
  });
}

// Signed URLs for an entry's files, by storage path. Fetched up front so each
// file can be a plain link: iOS blocks a window.open() that follows an await.
export function useResourceUrls(entry: LibraryEntry) {
  const paths = entry.resources
    .flatMap((resource) => (resource.storage_path ? [resource.storage_path] : []))
    .sort();
  const refreshMs = (SIGNED_URL_SECONDS * 1000) / 2;

  return useQuery({
    queryKey: ['resource-urls', paths],
    enabled: paths.length > 0,
    queryFn: () => signResourceFiles(paths),
    // Refresh well before the URLs expire, including while the sheet stays open.
    staleTime: refreshMs,
    refetchInterval: refreshMs,
    placeholderData: (previous) => previous,
  });
}
