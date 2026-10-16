import { ChevronDown, ListMusic } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { AccountButton } from '@/components/AccountButton';
import { CoverFlow } from '@/components/CoverFlow';
import { Mascot } from '@/components/Mascot';
import { JamlistSheet, type JamlistSelection } from '@/components/JamlistSheet';
import { JamlistTiles } from '@/components/JamlistTiles';
import { FilterButton, ListFilterSheet } from '@/components/ListFilterSheet';
import { SongRow } from '@/components/SongRow';
import { selectionForEntry, SongSheet, type SongSelection } from '@/components/SongSheet';
import { Button, LoadError, Screen, TextField } from '@/components/ui';
import type { SongStatus } from '@/lib/database.types';
import { allStatuses, statusLabels, type LibraryEntry } from '@/lib/library';
import {
  activeFilterCount,
  applyListFilter,
  DEFAULT_FILTER,
  foldedSections,
  groupByStatus,
  learnedShowcase,
  readListPrefs,
  sectionOrder,
  sortEntries,
  writeListPrefs,
  type ListFilter,
} from '@/lib/listView';
import { useJamlists, useLibrary } from '@/lib/queries';

// The library: a Cover Flow of what you've learned, your jamlists, then songs
// by status. Searching or filtering turns it into one plain list of matches.
export function MyListPage() {
  const navigate = useNavigate();
  const library = useLibrary();
  const jamlists = useJamlists();

  const [prefs] = useState(readListPrefs);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListFilter>({ ...DEFAULT_FILTER, sort: prefs.sort });
  const [flat, setFlat] = useState(prefs.flat);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selection, setSelection] = useState<SongSelection | null>(null);
  const [jamlistSelection, setJamlistSelection] = useState<JamlistSelection | null>(null);

  const entries = library.data ?? [];
  const lists = jamlists.data ?? [];
  const open = (entry: LibraryEntry) => setSelection(selectionForEntry(entry));

  const changeFilter = (next: ListFilter) => {
    setFilter(next);
    writeListPrefs({ flat, sort: next.sort });
  };
  const changeFlat = (next: boolean) => {
    setFlat(next);
    writeListPrefs({ flat: next, sort: filter.sort });
  };

  const narrowed = query.trim() !== '' || activeFilterCount(filter) > 0;
  const counts = Object.fromEntries(
    allStatuses.map((status) => [status, entries.filter((entry) => entry.status === status).length]),
  ) as Record<SongStatus, number>;

  let content;
  if (narrowed || flat) {
    const visible = applyListFilter(entries, query, filter, lists);
    content = (
      <div className="flex flex-col gap-2 pb-6">
        {narrowed ? (
          <p className="text-sm text-muted">
            {visible.length === 1 ? '1 song' : `${visible.length} songs`}
          </p>
        ) : null}
        {visible.map((entry, index) => (
          <Row key={entry.id} entry={entry} index={index} onOpen={open} />
        ))}
        {visible.length === 0 ? <p className="pt-10 text-center text-muted">No songs match.</p> : null}
      </div>
    );
  } else {
    const learned = learnedShowcase(entries);
    const groups = groupByStatus(sortEntries(entries, filter.sort));
    content = (
      <>
        {learned.length > 0 ? (
          <CoverFlow
            title="Learned library"
            entries={learned}
            onOpen={open}
            paused={selection !== null || jamlistSelection !== null || filterOpen}
          />
        ) : (
          <EmptyLearned learning={groups.learning[0]} />
        )}
        <JamlistTiles
          jamlists={lists}
          library={entries}
          onOpen={(jamlist) => setJamlistSelection({ kind: 'jamlist', id: jamlist.id })}
          onNew={() => setJamlistSelection({ kind: 'new' })}
        />
        <div className="flex flex-col gap-6 pb-6">
          {sectionOrder.map((status) =>
            groups[status].length > 0 ? (
              <Section
                key={status}
                status={status}
                entries={groups[status]}
                folded={foldedSections.has(status)}
                onOpen={open}
              />
            ) : null,
          )}
        </div>
      </>
    );
  }

  return (
    <Screen title="My List" action={<AccountButton />}>
      {library.isPending ? (
        <p className="pt-16 text-center text-muted">Loading your list…</p>
      ) : library.isError ? (
        <LoadError
          message="Couldn't load your list."
          onRetry={() => library.refetch()}
          retrying={library.isFetching}
        />
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 pt-16 text-center">
          <ListMusic className="size-10 animate-bob text-brand" aria-hidden />
          <p className="text-muted">Songs you log show up here.</p>
          <Button label="Log your first song" onClick={() => navigate('/add')} />
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                type="search"
                aria-label="Search your songs"
                placeholder="Search your songs"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                enterKeyHint="search"
              />
            </div>
            <FilterButton filter={filter} onClick={() => setFilterOpen(true)} />
          </div>
          {content}
        </>
      )}

      <ListFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filter={filter}
        onChange={changeFilter}
        flat={flat}
        onFlatChange={changeFlat}
        counts={counts}
        total={entries.length}
        jamlists={lists}
      />
      <SongSheet selection={selection} onSelect={setSelection} onClose={() => setSelection(null)} />
      <JamlistSheet
        selection={jamlistSelection}
        onSelect={setJamlistSelection}
        onClose={() => setJamlistSelection(null)}
      />
    </Screen>
  );
}

// Where the learned library will be: the mascot cheering you on to fill it.
function EmptyLearned({ learning }: { learning: LibraryEntry | undefined }) {
  const navigate = useNavigate();

  return (
    <section
      aria-label="Learned library"
      className="mb-6 flex animate-rise flex-col items-center gap-3 rounded-3xl border border-border bg-surface p-6 text-center"
    >
      <Mascot mood="happy" size={72} />
      <h2 className="text-lg font-bold text-text">Your learned library is waiting</h2>
      <p className="text-muted">
        {learning
          ? `Every song you finish learning lands up here. Keep going with ${learning.song.title}, then mark it Learned!`
          : "Every song you finish learning lands up here. Go find one you love and start learning it!"}
      </p>
      {learning ? (
        <Button label="Start practice" onClick={() => navigate('/')} />
      ) : (
        <Button label="Find a song to learn" onClick={() => navigate('/add')} />
      )}
    </section>
  );
}

function Row({ entry, index, onOpen }: { entry: LibraryEntry; index: number; onOpen: (entry: LibraryEntry) => void }) {
  return (
    <SongRow
      index={index}
      title={entry.song.title}
      artist={entry.song.artist}
      coverUrl={entry.song.cover_url}
      status={entry.status}
      onClick={() => onOpen(entry)}
    />
  );
}

type SectionProps = {
  status: SongStatus;
  entries: LibraryEntry[];
  folded: boolean;
  onOpen: (entry: LibraryEntry) => void;
};

function Section({ status, entries, folded, onOpen }: SectionProps) {
  const [expanded, setExpanded] = useState(!folded);
  const heading = (
    <>
      {statusLabels[status]}
      <span className="ml-2 text-sm font-medium text-muted tabular-nums">{entries.length}</span>
    </>
  );

  return (
    <section className="flex flex-col gap-2">
      {folded ? (
        <h2>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="flex h-11 w-full items-center justify-between text-left text-lg font-bold text-text"
          >
            <span>{heading}</span>
            <ChevronDown
              className={`size-5 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        </h2>
      ) : (
        <h2 className="text-lg font-bold text-text">{heading}</h2>
      )}
      {expanded
        ? entries.map((entry, index) => <Row key={entry.id} entry={entry} index={index} onOpen={onOpen} />)
        : null}
    </section>
  );
}
