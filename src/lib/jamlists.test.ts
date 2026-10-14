import { describe, expect, it } from 'vitest';

import {
  hasEntry,
  jamlistCover,
  jamlistEntries,
  jamlistEntryIds,
  moveId,
  songCountLabel,
  songsFor,
  toggleId,
  type Jamlist,
} from './jamlists';
import { testEntry } from './testEntries';

function jamlist(ids: string[], coverUrl: string | null = null): Jamlist {
  return {
    id: 'jam-1',
    user_id: 'user-1',
    name: 'Campfire',
    cover_path: coverUrl ? 'user-1/covers/x.jpg' : null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    // Stored out of order on purpose: position decides.
    songs: songsFor(ids).reverse(),
    cover_url: coverUrl,
  };
}

describe('jamlistEntries', () => {
  it('follows position order and skips entries no longer in the library', () => {
    const library = [testEntry('a'), testEntry('b'), testEntry('c')];
    const list = jamlist(['c', 'gone', 'a']);
    expect(jamlistEntryIds(list)).toEqual(['c', 'gone', 'a']);
    expect(jamlistEntries(list, library).map((entry) => entry.id)).toEqual(['c', 'a']);
  });
});

describe('jamlistCover', () => {
  const entries = [testEntry('a'), testEntry('b', { coverUrl: 'b.jpg' }), testEntry('c', { coverUrl: 'c.jpg' })];

  it('uses its own picture first', () => {
    expect(jamlistCover(jamlist(['a'], 'own.jpg'), entries)).toBe('own.jpg');
  });
  it('otherwise the first song that has a cover', () => {
    expect(jamlistCover(jamlist(['a']), entries)).toBe('b.jpg');
  });
  it('otherwise none', () => {
    expect(jamlistCover(jamlist([]), [testEntry('a')])).toBeNull();
  });
});

describe('membership and order', () => {
  it('toggles an id in and out', () => {
    expect(toggleId(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
    expect(hasEntry(jamlist(['a']), 'a')).toBe(true);
    expect(hasEntry(jamlist(['a']), 'b')).toBe(false);
  });

  it('moves an id one place, and not past either end', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moveId(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveId(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
    expect(moveId(['a'], 'x', 1)).toEqual(['a']);
  });

  it('numbers positions from zero', () => {
    expect(songsFor(['x', 'y'])).toEqual([
      { user_song_id: 'x', position: 0 },
      { user_song_id: 'y', position: 1 },
    ]);
  });

  it('labels song counts', () => {
    expect(songCountLabel(1)).toBe('1 song');
    expect(songCountLabel(0)).toBe('0 songs');
  });
});
