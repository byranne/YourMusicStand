export { queryClient } from './client';
export { AuthProvider, useSession } from './useSession';
export { useChangePassword, useSignIn, useSignOut, useSignUp } from './useAuth';
export { isPendingEntry, useLibrary, useLogSong, useRemoveEntry, useSetCover, useUpdateEntry } from './useLibrary';
export type { EntryPatch } from './useLibrary';
export { useAddFile, useAddLink, useRemoveResource, useResourceUrls } from './useResources';
export { useSongSearch } from './useSongSearch';
export { useDeleteSession, useSaveSession, useSessions } from './usePractice';
export type { SaveSessionInput } from './usePractice';
export {
  DEFAULT_SETTINGS,
  useProfile,
  useSetAvatarPhoto,
  useSettings,
  useUpdateProfile,
  useUpdateSettings,
} from './useProfile';
export type { Profile, ProfilePatch, Settings } from './useProfile';
export {
  useCreateJamlist,
  useDeleteJamlist,
  useJamlists,
  useRenameJamlist,
  useSetJamlistCover,
  useSetJamlistSongs,
} from './useJamlists';
