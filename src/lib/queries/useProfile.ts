import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AVATAR_PX, avatarPathFor, type AvatarPreset } from '../avatars';
import { shrinkCover } from '../covers';
import type { Crop } from '../crop';
import type { Tables } from '../database.types';
import { isBackground, type Background } from '../theme';
import { supabase } from '../supabase';
import { removeResourceFiles, signCovers, uploadCover } from './resourceFiles';
import { useSession } from './useSession';

// avatar_photo_url is display-only: a signed URL for avatar_path, never written back.
export type Profile = Tables<'profiles'> & { avatar_photo_url: string | null };

export type Settings = { weeklyGoalMin: number | null; background: Background };
export const DEFAULT_SETTINGS: Settings = { weeklyGoalMin: null, background: 'plain' };

export const profileKey = (userId: string | undefined) => ['profile', userId] as const;
export const settingsKey = (userId: string | undefined) => ['settings', userId] as const;

async function withPhoto(row: Tables<'profiles'>): Promise<Profile> {
  if (!row.avatar_path) return { ...row, avatar_photo_url: null };
  // A photo that can't be signed falls back to the preset or initials.
  const urls = await signCovers([row.avatar_path]).catch(() => ({}) as Record<string, string>);
  return { ...row, avatar_photo_url: urls[row.avatar_path] ?? null };
}

// The signed-in user's own profile row (created by the signup trigger).
export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: profileKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return withPhoto(data);
    },
  });
}

export type ProfilePatch = { display_name?: string | null; avatar_preset?: AvatarPreset | null };

// Name and preset changes. Picking a preset drops an uploaded photo.
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const key = profileKey(userId);

  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      if (!userId) throw new Error('You are signed out. Sign in and try again.');
      // Read from the row, not the cache: onMutate has already cleared the cached path.
      let previousPath: string | null = null;
      if (patch.avatar_preset !== undefined) {
        const { data: current, error } = await supabase.from('profiles').select('avatar_path').eq('id', userId).single();
        if (error) throw error;
        previousPath = current.avatar_path;
      }
      const dropPhoto = previousPath !== null;
      const { data, error } = await supabase
        .from('profiles')
        .update(dropPhoto ? { ...patch, avatar_path: null } : patch)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      if (previousPath) await removeResourceFiles([{ storage_path: previousPath }]);
      return withPhoto(data);
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Profile>(key);
      if (previous) {
        const photo = patch.avatar_preset !== undefined ? { avatar_path: null, avatar_photo_url: null } : {};
        queryClient.setQueryData<Profile>(key, { ...previous, ...patch, ...photo });
      }
      return { previous };
    },
    onSuccess: (profile) => queryClient.setQueryData(key, profile),
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
  });
}

// Uploads a photo (cut to the cropper's square and shrunk) as the avatar,
// replacing any earlier photo. Pass null to remove the photo.
export function useSetAvatarPhoto() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const key = profileKey(userId);

  return useMutation({
    mutationFn: async (photo: { file: File; crop: Crop } | null) => {
      if (!userId) throw new Error('You are signed out. Sign in and try again.');
      const previousPath = queryClient.getQueryData<Profile>(key)?.avatar_path ?? null;
      let path: string | null = null;
      if (photo) {
        const image = await shrinkCover(photo.file, { max: AVATAR_PX, crop: photo.crop });
        // Not crypto.randomUUID(): that needs HTTPS, and the dev server is plain HTTP on the LAN.
        path = avatarPathFor(userId, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await uploadCover(path, image);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_path: path, avatar_preset: null })
        .eq('id', userId);
      if (error) {
        if (path) await removeResourceFiles([{ storage_path: path }]);
        throw error;
      }
      if (previousPath) await removeResourceFiles([{ storage_path: previousPath }]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

// Private preferences. A user without a settings row gets the defaults.
export function useSettings() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: settingsKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase.from('user_settings').select('*').maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;
      return {
        weeklyGoalMin: data.weekly_goal_min,
        background: isBackground(data.background) ? data.background : 'plain',
      };
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const key = settingsKey(userId);

  return useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      if (!userId) throw new Error('You are signed out. Sign in and try again.');
      // The optimistic copy already holds the merged settings.
      const next = { ...DEFAULT_SETTINGS, ...queryClient.getQueryData<Settings>(key), ...patch };
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, weekly_goal_min: next.weeklyGoalMin, background: next.background });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Settings>(key);
      queryClient.setQueryData<Settings>(key, { ...DEFAULT_SETTINGS, ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
  });
}
