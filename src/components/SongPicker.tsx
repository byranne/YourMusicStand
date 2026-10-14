import { useState, type ReactNode } from 'react';

import { Chip, TextField } from '@/components/ui';
import type { SongStatus } from '@/lib/database.types';
import { allStatuses, filterLibrary, statusLabels, type LibraryEntry } from '@/lib/library';
import { recentSongs, type PracticeSession } from '@/lib/stats';

// Up to this many songs, just list them all.
export const SMALL_LIBRARY = 6;
const PAGE = 20;

type SongPickerProps = {
  entries: LibraryEntry[];
  sessions: PracticeSession[];
  // Songs to keep on top regardless of recency, e.g. the ones opened this session.
  pinned?: readonly string[];
  // Scroll the rows inside a box of limited height instead of growing the page.
  scroll?: boolean;
  renderRow: (entry: LibraryEntry) => ReactNode;
};

// A long library as a short list: your recent songs first, with search and a
// status filter for the rest.
export function SongPicker({ entries, sessions, pinned = [], scroll = false, renderRow }: SongPickerProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SongStatus | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const list = `flex flex-col gap-2 ${scroll ? 'max-h-[40dvh] overflow-y-auto overscroll-contain' : ''}`;

  if (entries.length <= SMALL_LIBRARY) {
    return scroll ? <div className={list}>{entries.map(renderRow)}</div> : <>{entries.map(renderRow)}</>;
  }

  const searching = query.trim() !== '' || status !== null;
  const pinnedEntries = pinned.flatMap((id) => entries.find((entry) => entry.id === id) ?? []);
  const recent = recentSongs(
    entries.filter((entry) => !pinned.includes(entry.id)),
    sessions,
  );
  const inStatus = status ? entries.filter((entry) => entry.status === status) : entries;
  const matches = query.trim() ? filterLibrary(inStatus, query) : inStatus;
  const rows = searching ? matches.slice(0, limit) : [...pinnedEntries, ...recent];

  const choose = (next: SongStatus | null) => {
    setStatus(next);
    setLimit(PAGE);
  };

  return (
    <div className="flex flex-col gap-2">
      <TextField
        type="search"
        aria-label="Search your songs"
        placeholder="Search your songs"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setLimit(PAGE);
        }}
        autoCorrect="off"
        autoCapitalize="none"
        enterKeyHint="search"
      />
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {allStatuses.map((value) => (
          <Chip
            key={value}
            label={statusLabels[value]}
            tone={status === value ? 'selected' : 'neutral'}
            pressed={status === value}
            onClick={() => choose(status === value ? null : value)}
          />
        ))}
      </div>

      <div className={list}>
        {/* Not a heading: the picker sits under an h2 on Home and an h3 in the recap. */}
        {searching ? null : <p className="pt-1 text-xs font-semibold tracking-wide text-muted uppercase">Recent</p>}
        {rows.map(renderRow)}
        {searching && matches.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No songs match.</p>
        ) : null}
        {searching && matches.length > limit ? (
          <button
            type="button"
            onClick={() => setLimit((value) => value + PAGE)}
            className="h-11 shrink-0 text-sm font-medium text-muted"
          >
            Show more ({matches.length - limit} left)
          </button>
        ) : null}
        {searching ? null : (
          <p className="text-center text-sm text-muted">Search or filter to find your other songs.</p>
        )}
      </div>
    </div>
  );
}
