import { describe, expect, it } from 'vitest';

import {
  buildQuery,
  dedupeRecordings,
  mapRecording,
  normalizeForMatch,
  type MusicBrainzRecording,
} from './musicbrainz';

// Trimmed from real /ws/2/recording responses.
const studio: MusicBrainzRecording = {
  id: '7d2a5b5c-0c0f-4f4a-8d8a-000000000001',
  score: 79,
  title: 'Wonderwall',
  length: 258773,
  'first-release-date': '1995-10-02',
  'artist-credit': [{ name: 'Oasis' }],
  releases: [
    {
      id: 'rel-compilation',
      title: 'Stop the Clocks',
      status: 'Official',
      date: '2006-11-20',
      'release-group': { id: 'rg-compilation', 'primary-type': 'Album', 'secondary-types': ['Compilation'] },
    },
    {
      id: 'rel-album-reissue',
      title: "(What's the Story) Morning Glory?",
      status: 'Official',
      date: '2014-09-29',
      'release-group': { id: 'rg-album', 'primary-type': 'Album', 'secondary-types': [] },
    },
    {
      id: 'rel-album',
      title: "(What's the Story) Morning Glory?",
      status: 'Official',
      date: '1995-10-02',
      'release-group': { id: 'rg-album', 'primary-type': 'Album', 'secondary-types': [] },
    },
    {
      id: 'rel-single',
      title: 'Wonderwall',
      status: 'Official',
      date: '1995-10-30',
      'release-group': { id: 'rg-single', 'primary-type': 'Single' },
    },
  ],
};

const live: MusicBrainzRecording = {
  id: '7d2a5b5c-0c0f-4f4a-8d8a-000000000002',
  score: 79,
  title: 'Wonderwall (live)',
  length: 274400,
  'first-release-date': '2000',
  'artist-credit': [{ name: 'Oasis' }],
  releases: [
    {
      id: 'rel-live',
      title: 'Familiar to Millions',
      status: 'Official',
      date: '2000-11-13',
      'release-group': { id: 'rg-live', 'primary-type': 'Album', 'secondary-types': ['Live'] },
    },
  ],
};

const bootleg: MusicBrainzRecording = {
  id: '7d2a5b5c-0c0f-4f4a-8d8a-000000000003',
  score: 79,
  title: 'Wonderwall',
  length: null,
  'artist-credit': [{ name: 'Oasis' }],
  releases: [{ id: 'rel-bootleg', title: 'Maine Road', status: 'Bootleg', date: '' }],
};

const cover: MusicBrainzRecording = {
  id: '7d2a5b5c-0c0f-4f4a-8d8a-000000000004',
  score: 100,
  title: 'Wonderwall (Oasis)',
  length: 93507,
  'first-release-date': '2016-07-01',
  'artist-credit': [{ name: 'The Cover Ops' }],
  releases: [
    {
      id: 'rel-cover',
      title: 'The Best of The Cover Ops',
      status: 'Official',
      date: '2016-07-01',
      'release-group': { id: 'rg-cover', 'primary-type': 'Album', 'secondary-types': ['Compilation'] },
    },
  ],
};

describe('buildQuery', () => {
  it('matches every word against title or artist, with a prefix on the last word', () => {
    expect(buildQuery('Wonderwall oas')).toBe(
      '(recording:wonderwall^3 OR artist:wonderwall) AND ' +
        '(recording:oas^3 OR recording:oas* OR artist:oas OR artist:oas*)',
    );
  });

  it('does not prefix-match very short last words', () => {
    expect(buildQuery('neon jo')).toBe('(recording:neon^3 OR artist:neon) AND (recording:jo^3 OR artist:jo)');
  });

  it('strips Lucene syntax so user input cannot break the query', () => {
    expect(buildQuery('AC/DC: "T.N.T." (live)!')).toBe(
      '(recording:ac^3 OR artist:ac) AND (recording:dc^3 OR artist:dc) AND ' +
        '(recording:t.n.t.^3 OR artist:t.n.t.) AND ' +
        '(recording:live^3 OR recording:live* OR artist:live OR artist:live*)',
    );
  });

  it('returns an empty query for blank or symbol-only input', () => {
    expect(buildQuery('   ')).toBe('');
    expect(buildQuery('??')).toBe('');
  });
});

describe('mapRecording', () => {
  it('prefers the earliest official studio album for album and cover', () => {
    expect(mapRecording(studio)).toEqual({
      source: 'musicbrainz',
      mbid: studio.id,
      title: 'Wonderwall',
      artist: 'Oasis',
      album: "(What's the Story) Morning Glory?",
      coverUrl: 'https://coverartarchive.org/release-group/rg-album/front-250',
      durationMs: 258773,
      year: 1995,
    });
  });

  it('joins multi-artist credits with their join phrases', () => {
    const song = mapRecording({
      ...studio,
      'artist-credit': [{ name: 'Santana', joinphrase: ' feat. ' }, { name: 'Rob Thomas' }],
    });
    expect(song.artist).toBe('Santana feat. Rob Thomas');
  });

  it('handles a recording with no releases, length or artist', () => {
    expect(mapRecording({ id: 'x', score: 50, title: 'Untitled' })).toEqual({
      source: 'musicbrainz',
      mbid: 'x',
      title: 'Untitled',
      artist: 'Unknown artist',
      album: null,
      coverUrl: null,
      durationMs: null,
      year: null,
    });
  });

  it('has no cover when the release has no release group', () => {
    expect(mapRecording(bootleg)).toMatchObject({ album: 'Maine Road', coverUrl: null, year: null });
  });
});

describe('normalizeForMatch', () => {
  it.each([
    ['Wonderwall (live)', 'wonderwall'],
    ['Wonderwall [Remastered 2014]', 'wonderwall'],
    ['Wonderwall - Remastered', 'wonderwall'],
    ["Don't Look Back in Anger", 'dont look back in anger'],
    ['  The   Beatles ', 'the beatles'],
    ['Stop - Go', 'stop go'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeForMatch(input)).toBe(expected);
  });
});

describe('dedupeRecordings', () => {
  it('collapses takes of the same song onto the studio recording', () => {
    const songs = dedupeRecordings([bootleg, live, studio]);
    expect(songs).toHaveLength(1);
    expect(songs[0]).toMatchObject({ mbid: studio.id, title: 'Wonderwall', year: 1995 });
  });

  it('ranks a widely released original above a better-scoring obscure cover', () => {
    const songs = dedupeRecordings([cover, bootleg, live, studio]);
    expect(songs.map((song) => song.artist)).toEqual(['Oasis', 'The Cover Ops']);
  });

  it('returns nothing for no recordings', () => {
    expect(dedupeRecordings([])).toEqual([]);
  });
});
