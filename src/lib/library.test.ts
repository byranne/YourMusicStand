import { describe, expect, it } from 'vitest';

import type { SongSource, SongStatus } from './database.types';
import {
  defaultsForStatus,
  filterLibrary,
  findEntry,
  formatDuration,
  parseCustomQuery,
  type LibraryEntry,
} from './library';

function entry(
  id: string,
  title: string,
  artist: string,
  options: { source?: SongSource; mbid?: string; status?: SongStatus } = {},
): LibraryEntry {
  const source = options.source ?? (options.mbid ? 'musicbrainz' : 'custom');
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
    learned_at: null,
    created_at: '2026-09-30T00:00:00Z',
    updated_at: '2026-09-30T00:00:00Z',
    resources: [],
    song: {
      id: `song-${id}`,
      mbid: options.mbid ?? null,
      title,
      artist,
      album: null,
      cover_url: null,
      cover_path: null,
      duration_ms: null,
      source,
      created_by: source === 'custom' ? 'user-1' : null,
      created_at: '2026-09-30T00:00:00Z',
    },
  };
}

const library = [
  entry('1', 'Wonderwall', 'Oasis', { mbid: 'mbid-wonderwall' }),
  entry('2', 'My Riff', 'Me'),
  entry('3', "Don't Look Back in Anger", 'Oasis', { mbid: 'mbid-anger' }),
];

const catalogSong = (mbid: string, title: string, artist: string) =>
  ({ source: 'musicbrainz', mbid, title, artist, album: null, coverUrl: null, durationMs: null, year: null }) as const;

describe('findEntry', () => {
  it('matches catalog songs by MusicBrainz id whatever the title says', () => {
    expect(findEntry(library, catalogSong('mbid-wonderwall', 'Wonderwall 2', 'Someone'))?.id).toBe('1');
  });

  it('matches a different recording of a logged song by title and artist', () => {
    expect(findEntry(library, catalogSong('mbid-other', 'Wonderwall (live)', 'Oasis'))?.id).toBe('1');
  });

  it('matches custom songs by title and artist, ignoring case and punctuation', () => {
    expect(findEntry(library, { source: 'custom', title: ' my riff! ', artist: 'ME' })?.id).toBe('2');
  });

  it('matches a custom candidate that duplicates a catalog entry', () => {
    expect(findEntry(library, { source: 'custom', title: 'wonderwall', artist: 'oasis' })?.id).toBe('1');
  });

  it('does not match the same title by a different artist', () => {
    expect(findEntry(library, { source: 'custom', title: 'My Riff', artist: 'Someone else' })).toBeUndefined();
    expect(findEntry(library, catalogSong('mbid-cover', 'Wonderwall', 'Ryan Adams'))).toBeUndefined();
  });
});

describe('filterLibrary', () => {
  it('needs every word to appear in the title or artist', () => {
    expect(filterLibrary(library, 'oasis wonder').map((e) => e.id)).toEqual(['1']);
    expect(filterLibrary(library, 'oasis').map((e) => e.id)).toEqual(['1', '3']);
    expect(filterLibrary(library, 'oasis riff')).toEqual([]);
  });

  it('ignores case and punctuation', () => {
    expect(filterLibrary(library, 'DONT look').map((e) => e.id)).toEqual(['3']);
  });

  it('returns nothing for a blank query', () => {
    expect(filterLibrary(library, '  ')).toEqual([]);
  });
});

describe('parseCustomQuery', () => {
  it.each([
    ['my riff - me', { title: 'my riff', artist: 'me' }],
    ['Neon – John Mayer', { title: 'Neon', artist: 'John Mayer' }],
    ['Blackbird by The Beatles', { title: 'Blackbird', artist: 'The Beatles' }],
    ['Stand by Me by Ben E. King', { title: 'Stand by Me', artist: 'Ben E. King' }],
    ['  campfire   jam ', { title: 'campfire jam', artist: '' }],
    ['Standby', { title: 'Standby', artist: '' }],
  ])('%s', (query, expected) => {
    expect(parseCustomQuery(query)).toEqual(expected);
  });
});

describe('defaultsForStatus', () => {
  it('marks learned songs as fully progressed and leaves the rest alone', () => {
    expect(defaultsForStatus('learned')).toEqual({ progress: 100 });
    expect(defaultsForStatus('learning')).toEqual({});
    expect(defaultsForStatus('want_to_learn')).toEqual({});
    expect(defaultsForStatus('shelved')).toEqual({});
  });
});

describe('formatDuration', () => {
  it.each([
    [258773, '4:19'],
    [60000, '1:00'],
    [5400, '0:05'],
    [3600000, '60:00'],
  ])('%d ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});
