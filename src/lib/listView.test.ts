import { describe, expect, it } from 'vitest';

import { songsFor, type Jamlist } from './jamlists';
import {
  activeFilterCount,
  applyListFilter,
  DEFAULT_FILTER,
  groupByStatus,
  learnedShowcase,
  parseListPrefs,
  sortEntries,
} from './listView';
import { testEntry } from './testEntries';

const library = [
  testEntry('1', { title: 'Wonderwall', artist: 'Oasis', status: 'learning', updatedAt: '2026-10-03T00:00:00Z' }),
  testEntry('2', { title: 'blackbird', artist: 'The Beatles', status: 'learned', updatedAt: '2026-10-01T00:00:00Z' }),
  testEntry('3', { title: 'Champagne Supernova', artist: 'Oasis', status: 'want_to_learn', updatedAt: '2026-10-02T00:00:00Z' }),
  testEntry('4', { title: 'Yesterday', artist: 'The Beatles', status: 'shelved', updatedAt: '2026-09-01T00:00:00Z' }),
];

const ids = (entries: { id: string }[]) => entries.map((entry) => entry.id);

const jam: Jamlist = {
  id: 'jam',
  user_id: 'user-1',
  name: 'Set',
  cover_path: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  songs: songsFor(['3', '1']),
  cover_url: null,
};

describe('sortEntries', () => {
  it('sorts by most recent change, title (ignoring case) or artist then title', () => {
    expect(ids(sortEntries(library, 'recent'))).toEqual(['1', '3', '2', '4']);
    expect(ids(sortEntries(library, 'title'))).toEqual(['2', '3', '1', '4']);
    expect(ids(sortEntries(library, 'artist'))).toEqual(['3', '1', '2', '4']);
  });
});

describe('applyListFilter', () => {
  it('shows everything for an empty search and no filter', () => {
    expect(ids(applyListFilter(library, '  ', DEFAULT_FILTER, []))).toEqual(['1', '3', '2', '4']);
  });

  it('narrows by search and status together', () => {
    expect(ids(applyListFilter(library, 'oasis', DEFAULT_FILTER, []))).toEqual(['1', '3']);
    expect(ids(applyListFilter(library, 'oasis', { ...DEFAULT_FILTER, status: 'learning' }, []))).toEqual(['1']);
  });

  it('keeps a jamlist in its own order unless another sort is picked', () => {
    const filter = { ...DEFAULT_FILTER, jamlistId: 'jam' };
    expect(ids(applyListFilter(library, '', filter, [jam]))).toEqual(['3', '1']);
    expect(ids(applyListFilter(library, '', { ...filter, sort: 'title' }, [jam]))).toEqual(['3', '1']);
    expect(ids(applyListFilter(library, '', { ...filter, sort: 'artist' }, [jam]))).toEqual(['3', '1']);
  });

  it('ignores a jamlist that no longer exists', () => {
    expect(ids(applyListFilter(library, '', { ...DEFAULT_FILTER, jamlistId: 'gone' }, [jam]))).toHaveLength(4);
  });

  it('counts status and jamlist as filters, not sort', () => {
    expect(activeFilterCount(DEFAULT_FILTER)).toBe(0);
    expect(activeFilterCount({ status: 'learned', jamlistId: 'jam', sort: 'title' })).toBe(2);
  });
});

describe('learnedShowcase', () => {
  it('shows learned songs, most recently learned first', () => {
    const entries = [
      ...library,
      testEntry('5', { status: 'learned', learnedAt: '2026-10-05T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' }),
    ];
    expect(ids(learnedShowcase(entries))).toEqual(['5', '2']);
  });

  it('is empty until something is learned, and has no cap', () => {
    expect(learnedShowcase(library.filter((entry) => entry.status !== 'learned'))).toEqual([]);
    const many = Array.from({ length: 40 }, (_, index) => testEntry(`l${index}`, { status: 'learned' }));
    expect(learnedShowcase(many)).toHaveLength(40);
  });
});

describe('groupByStatus', () => {
  it('puts every entry under its status', () => {
    const groups = groupByStatus(library);
    expect(ids(groups.learning)).toEqual(['1']);
    expect(ids(groups.want_to_learn)).toEqual(['3']);
    expect(ids(groups.learned)).toEqual(['2']);
    expect(ids(groups.shelved)).toEqual(['4']);
  });
});

describe('parseListPrefs', () => {
  it('reads what was stored and defaults anything else', () => {
    expect(parseListPrefs('{"flat":true,"sort":"artist"}')).toEqual({ flat: true, sort: 'artist' });
    expect(parseListPrefs('{"flat":"yes","sort":"nope"}')).toEqual({ flat: false, sort: 'recent' });
    expect(parseListPrefs('not json')).toEqual({ flat: false, sort: 'recent' });
    expect(parseListPrefs(null)).toEqual({ flat: false, sort: 'recent' });
  });
});
