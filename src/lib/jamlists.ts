import type { Tables } from './database.types';
import type { LibraryEntry } from './library';

// A named, ordered group of library entries. `songs` are its rows in
// jamlist_songs; `cover_url` is the signed URL of its own cover_path, filled in
// by the query for display and never written back.
export type Jamlist = Tables<'jamlists'> & {
  songs: Pick<Tables<'jamlist_songs'>, 'user_song_id' | 'position'>[];
  cover_url: string | null;
};

export const JAMLIST_NAME_MAX = 60;

// The jamlist's entry ids in order.
export function jamlistEntryIds(jamlist: Jamlist): string[] {
  return [...jamlist.songs].sort((a, b) => a.position - b.position).map((song) => song.user_song_id);
}

// The jamlist's entries in order, skipping any no longer in the library.
export function jamlistEntries(jamlist: Jamlist, library: LibraryEntry[]): LibraryEntry[] {
  const byId = new Map(library.map((entry) => [entry.id, entry]));
  return jamlistEntryIds(jamlist).flatMap((id) => byId.get(id) ?? []);
}

// Its own picture first, then the first of its songs that has a cover.
export function jamlistCover(jamlist: Jamlist, entries: LibraryEntry[]): string | null {
  return jamlist.cover_url ?? entries.find((entry) => entry.song.cover_url)?.song.cover_url ?? null;
}

export function hasEntry(jamlist: Jamlist, entryId: string): boolean {
  return jamlist.songs.some((song) => song.user_song_id === entryId);
}

// Takes the id out if it is there, otherwise adds it at the end.
export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id];
}

// Moves an id one place up (-1) or down (+1); at either end nothing changes.
export function moveId(ids: readonly string[], id: string, delta: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

// The rows set_jamlist_songs will write for these ids, for optimistic updates.
export function songsFor(ids: readonly string[]): Jamlist['songs'] {
  return ids.map((user_song_id, position) => ({ user_song_id, position }));
}

export function songCountLabel(count: number): string {
  return count === 1 ? '1 song' : `${count} songs`;
}
