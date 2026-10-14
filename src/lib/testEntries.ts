import type { SongStatus } from './database.types';
import type { LibraryEntry } from './library';

// A library entry for tests, with only what a test cares about set.
export function testEntry(
  id: string,
  options: {
    title?: string;
    artist?: string;
    status?: SongStatus;
    updatedAt?: string;
    learnedAt?: string | null;
    coverUrl?: string | null;
  } = {},
): LibraryEntry {
  const updatedAt = options.updatedAt ?? '2026-09-30T00:00:00Z';
  return {
    id,
    user_id: 'user-1',
    song_id: `song-${id}`,
    status: options.status ?? 'learning',
    progress: 0,
    difficulty: null,
    tuning: null,
    capo: null,
    notes: null,
    started_at: null,
    learned_at: options.learnedAt ?? null,
    cover_path: null,
    created_at: updatedAt,
    updated_at: updatedAt,
    resources: [],
    song: {
      id: `song-${id}`,
      mbid: null,
      title: options.title ?? `Song ${id}`,
      artist: options.artist ?? 'Artist',
      album: null,
      cover_url: options.coverUrl ?? null,
      cover_path: null,
      duration_ms: null,
      source: 'custom',
      created_by: 'user-1',
      created_at: updatedAt,
    },
  };
}
