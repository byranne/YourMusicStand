import type { SongStatus } from './database.types';
import { jamlistEntryIds, type Jamlist } from './jamlists';
import { filterLibrary, type LibraryEntry } from './library';

// How My List is narrowed and ordered. Search text is kept separately.
export type ListSort = 'recent' | 'title' | 'artist';
export type ListFilter = { status: SongStatus | null; jamlistId: string | null; sort: ListSort };

export const DEFAULT_FILTER: ListFilter = { status: null, jamlistId: null, sort: 'recent' };

export const sortLabels: Record<ListSort, string> = { recent: 'Recent', title: 'Title', artist: 'Artist' };

// Status and jamlist narrow the list; sort only reorders it.
export function activeFilterCount(filter: ListFilter): number {
  return (filter.status ? 1 : 0) + (filter.jamlistId ? 1 : 0);
}

const byText = (pick: (entry: LibraryEntry) => string) => (a: LibraryEntry, b: LibraryEntry) =>
  pick(a).localeCompare(pick(b), undefined, { sensitivity: 'base' });

export function sortEntries(entries: LibraryEntry[], sort: ListSort): LibraryEntry[] {
  const sorted = [...entries];
  if (sort === 'title') return sorted.sort(byText((entry) => entry.song.title));
  if (sort === 'artist') {
    const byArtist = byText((entry) => entry.song.artist);
    const byTitle = byText((entry) => entry.song.title);
    return sorted.sort((a, b) => byArtist(a, b) || byTitle(a, b));
  }
  // ISO timestamps sort as text.
  return sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

// The entries My List shows for a search and filter. A jamlist filter keeps
// the jamlist's own order unless another sort was picked.
export function applyListFilter(
  entries: LibraryEntry[],
  query: string,
  filter: ListFilter,
  jamlists: Jamlist[],
): LibraryEntry[] {
  let visible = query.trim() ? filterLibrary(entries, query) : entries;
  if (filter.status) visible = visible.filter((entry) => entry.status === filter.status);

  const jamlist = filter.jamlistId ? jamlists.find((list) => list.id === filter.jamlistId) : undefined;
  if (filter.jamlistId && !jamlist) return sortEntries(visible, filter.sort);
  if (jamlist) {
    const order = jamlistEntryIds(jamlist);
    const rank = new Map(order.map((id, index) => [id, index]));
    visible = visible.filter((entry) => rank.has(entry.id));
    if (filter.sort === 'recent') return visible.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }
  return sortEntries(visible, filter.sort);
}

// The cover arc at the top of My List: the learned library, most recently learned first.
export function learnedShowcase(entries: LibraryEntry[]): LibraryEntry[] {
  const learnedAt = (entry: LibraryEntry) => entry.learned_at ?? entry.updated_at;
  return entries
    .filter((entry) => entry.status === 'learned')
    .sort((a, b) => learnedAt(b).localeCompare(learnedAt(a)));
}

// The sections under the ring, in this order. Learned songs are in the ring,
// so they have no section; Shelved starts folded.
export const sectionOrder: SongStatus[] = ['learning', 'want_to_learn', 'shelved'];
export const foldedSections: ReadonlySet<SongStatus> = new Set(['shelved']);

// Keeps the order it is given, so sort first.
export function groupByStatus(entries: LibraryEntry[]): Record<SongStatus, LibraryEntry[]> {
  const groups: Record<SongStatus, LibraryEntry[]> = { want_to_learn: [], learning: [], learned: [], shelved: [] };
  for (const entry of entries) groups[entry.status].push(entry);
  return groups;
}

// ---------------------------------------------------------------------------
// Per-device preferences: flat list and sort. Storage can be missing or throw.
// ---------------------------------------------------------------------------
const PREFS_KEY = 'musicstand:listPrefs';

export type ListPrefs = { flat: boolean; sort: ListSort };
const DEFAULT_PREFS: ListPrefs = { flat: false, sort: 'recent' };

export function parseListPrefs(raw: string | null): ListPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return DEFAULT_PREFS;
    const prefs = value as Record<string, unknown>;
    return {
      flat: prefs.flat === true,
      sort: prefs.sort === 'title' || prefs.sort === 'artist' ? prefs.sort : 'recent',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function readListPrefs(): ListPrefs {
  try {
    return parseListPrefs(localStorage.getItem(PREFS_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writeListPrefs(prefs: ListPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Kept for this visit only.
  }
}
