// The only MusicBrainz caller. If the app grows, a `search-songs` edge function
// can replace searchSongs() behind the same signature.

export type MusicBrainzSong = {
  source: 'musicbrainz';
  mbid: string;
  title: string;
  artist: string;
  album: string | null;
  coverUrl: string | null;
  durationMs: number | null;
  year: number | null;
};

// The parts of a /ws/2/recording search hit that we read.
export type MusicBrainzRelease = {
  id: string;
  title: string;
  status?: string | null;
  date?: string | null;
  'release-group'?: {
    id: string;
    'primary-type'?: string | null;
    'secondary-types'?: string[];
  };
};

export type MusicBrainzRecording = {
  id: string;
  score: number;
  title: string;
  length?: number | null;
  'first-release-date'?: string | null;
  'artist-credit'?: { name: string; joinphrase?: string }[];
  releases?: MusicBrainzRelease[];
};

const ENDPOINT = 'https://musicbrainz.org/ws/2/recording';
const FETCH_LIMIT = 50;
const MAX_RESULTS = 20;
// MusicBrainz allows 1 request per second per IP.
const MIN_INTERVAL_MS = 1100;

const LUCENE_SPECIALS = /[+\-&|!(){}[\]^"~*?:\\/]/g;

// Every word must match the title or the artist. Titles are boosted so "wonderwall"
// finds the song before a band of that name, and the last word also matches as a
// prefix because the user is usually still typing it.
export function buildQuery(text: string): string {
  const terms = text.toLowerCase().replace(LUCENE_SPECIALS, ' ').split(/\s+/).filter(Boolean);
  return terms
    .map((term, i) =>
      i === terms.length - 1 && term.length >= 3
        ? `(recording:${term}^3 OR recording:${term}* OR artist:${term} OR artist:${term}*)`
        : `(recording:${term}^3 OR artist:${term})`,
    )
    .join(' AND ');
}

// Lower is better: studio album, then single/EP, then compilations and live
// albums, then bootlegs and promos.
function releaseTier(release: MusicBrainzRelease): number {
  if (release.status !== 'Official') return 3;
  const group = release['release-group'];
  if (group?.['secondary-types']?.length) return 2;
  return group?.['primary-type'] === 'Album' ? 0 : 1;
}

function bestRelease(releases: MusicBrainzRelease[]): MusicBrainzRelease | null {
  let best: MusicBrainzRelease | null = null;
  for (const release of releases) {
    if (!best) {
      best = release;
      continue;
    }
    const diff = releaseTier(release) - releaseTier(best);
    // Undated releases sort last within a tier.
    if (diff < 0 || (diff === 0 && (release.date || '9999') < (best.date || '9999'))) {
      best = release;
    }
  }
  return best;
}

function parseYear(date: string | null | undefined): number | null {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

export function mapRecording(recording: MusicBrainzRecording): MusicBrainzSong {
  const release = bestRelease(recording.releases ?? []);
  const groupId = release?.['release-group']?.id;

  return {
    source: 'musicbrainz',
    mbid: recording.id,
    title: recording.title,
    artist:
      (recording['artist-credit'] ?? [])
        .map((credit) => credit.name + (credit.joinphrase ?? ''))
        .join('')
        .trim() || 'Unknown artist',
    album: release?.title ?? null,
    // add_musicbrainz_song only accepts coverartarchive.org URLs.
    coverUrl: groupId ? `https://coverartarchive.org/release-group/${groupId}/front-250` : null,
    durationMs: recording.length && recording.length > 0 ? recording.length : null,
    year: parseYear(recording['first-release-date']) ?? parseYear(release?.date),
  };
}

// "Wonderwall (live)" and "Wonderwall - Remastered" are the same song as "Wonderwall".
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[([].*?[)\]]/g, ' ')
    .replace(/\s-\s.*\b(remaster(ed)?|live|version|edit|mix|demo)\b.*$/, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// MusicBrainz returns every live take, remaster and bootleg as its own recording.
// Collapse them to one row per title + artist, represented by the recording with
// the best release, and rank songs by match score weighted by how widely released
// they are (the search score alone puts obscure covers above the original).
export function dedupeRecordings(recordings: MusicBrainzRecording[]): MusicBrainzSong[] {
  type Group = {
    song: MusicBrainzSong;
    tier: number;
    ownReleases: number;
    score: number;
    releases: number;
    year: number | null;
  };
  const groups = new Map<string, Group>();

  for (const recording of recordings) {
    const song = mapRecording(recording);
    const releases = recording.releases ?? [];
    const best = bestRelease(releases);
    const tier = best ? releaseTier(best) : 4;
    const key = `${normalizeForMatch(song.title)}|${normalizeForMatch(song.artist)}`;

    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        song,
        tier,
        ownReleases: releases.length,
        score: recording.score,
        releases: releases.length,
        year: song.year,
      });
      continue;
    }

    group.score = Math.max(group.score, recording.score);
    group.releases += releases.length;
    if (song.year && (!group.year || song.year < group.year)) group.year = song.year;
    if (tier < group.tier || (tier === group.tier && releases.length > group.ownReleases)) {
      group.song = song;
      group.tier = tier;
      group.ownReleases = releases.length;
    }
  }

  const rank = (group: Group) => group.score * Math.log2(2 + group.releases);

  return [...groups.values()]
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, MAX_RESULTS)
    .map((group) => ({ ...group.song, year: group.year }));
}

let lastRequestAt = 0;

// Spaces requests out to respect the rate limit. A search that is aborted while
// waiting never sends, so it doesn't use up a slot.
async function waitForSlot(signal?: AbortSignal): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, wait);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(signal.reason);
        },
        { once: true },
      );
    });
  }
  lastRequestAt = Date.now();
}

export async function searchSongs(text: string, signal?: AbortSignal): Promise<MusicBrainzSong[]> {
  const query = buildQuery(text);
  if (!query) return [];

  await waitForSlot(signal);

  const params = new URLSearchParams({ query, fmt: 'json', limit: String(FETCH_LIMIT) });
  const response = await fetch(`${ENDPOINT}?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`MusicBrainz search failed (${response.status})`);

  const body = (await response.json()) as { recordings?: MusicBrainzRecording[] };
  return dedupeRecordings(body.recordings ?? []);
}
