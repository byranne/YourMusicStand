import type { SongStatus, Tables } from './database.types';
import { normalizeForMatch, type MusicBrainzSong } from './musicbrainz';

// A song that could be logged. Every source (catalog search today; imports or
// shared links later) produces one of these and goes through useLogSong().
export type SongCandidate = MusicBrainzSong | { source: 'custom'; title: string; artist: string };

export type LibraryEntry = Tables<'user_songs'> & { song: Tables<'songs'>; resources: Tables<'resources'>[] };

export const statusLabels: Record<SongStatus, string> = {
  want_to_learn: 'Want to learn',
  learning: 'Learning',
  learned: 'Learned',
  shelved: 'Shelved',
};

// What a new song can be logged as. Shelved only makes sense for an existing entry.
export const logStatuses: SongStatus[] = ['want_to_learn', 'learning', 'learned'];
export const allStatuses: SongStatus[] = [...logStatuses, 'shelved'];

// Fields that follow from a status, applied when a song is logged or its status changes.
export function defaultsForStatus(status: SongStatus): { progress?: number } {
  return status === 'learned' ? { progress: 100 } : {};
}

// The library entry for a candidate, if the user already has one. Matches by
// MusicBrainz id first, then by title + artist (ignoring case, punctuation and
// "(live)"-style suffixes), because a search can surface a different recording of
// a song that is already logged, and a custom song can duplicate a catalog one.
export function findEntry(library: LibraryEntry[], candidate: SongCandidate): LibraryEntry | undefined {
  if (candidate.source === 'musicbrainz') {
    const byId = library.find((entry) => entry.song.mbid === candidate.mbid);
    if (byId) return byId;
  }
  const title = normalizeForMatch(candidate.title);
  const artist = normalizeForMatch(candidate.artist);
  return library.find(
    (entry) => normalizeForMatch(entry.song.title) === title && normalizeForMatch(entry.song.artist) === artist,
  );
}

// Entries where every word of the query appears in the title or artist.
export function filterLibrary(library: LibraryEntry[], query: string): LibraryEntry[] {
  const words = normalizeForMatch(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  return library.filter((entry) => {
    const haystack = `${normalizeForMatch(entry.song.title)} ${normalizeForMatch(entry.song.artist)}`;
    return words.every((word) => haystack.includes(word));
  });
}

// Prefill for a custom song from what the user typed: "title - artist" or
// "title by artist"; otherwise the whole query is the title.
export function parseCustomQuery(query: string): { title: string; artist: string } {
  const text = query.trim().replace(/\s+/g, ' ');

  const dash = text.match(/^(.+?) [-–—] (.+)$/);
  if (dash) return { title: dash[1], artist: dash[2] };

  const by = text.match(/^(.+) by (.+)$/i);
  if (by) return { title: by[1], artist: by[2] };

  return { title: text, artist: '' };
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${Math.floor(totalSeconds / 60)}:${seconds}`;
}
