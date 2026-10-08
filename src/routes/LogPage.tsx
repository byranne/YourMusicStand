import { LoaderCircle, Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { ProfileButton } from '@/components/ProfileButton';
import { SongRow } from '@/components/SongRow';
import { selectionForEntry, SongSheet, type SongSelection } from '@/components/SongSheet';
import { Button, Screen, TextField } from '@/components/ui';
import { filterLibrary, findEntry, parseCustomQuery, type LibraryEntry } from '@/lib/library';
import { useLibrary, useSongSearch } from '@/lib/queries';

export function LogPage() {
  const [input, setInput] = useState('');
  const [selection, setSelection] = useState<SongSelection | null>(null);
  const library = useLibrary();
  const search = useSongSearch(input);

  const query = input.trim();
  const entries = library.data ?? [];

  // Songs the user already has: matches on what they typed, plus any catalog
  // result that is already logged. Those are left out of the catalog list.
  const libraryMatches = new Map<string, LibraryEntry>();
  for (const entry of filterLibrary(entries, query)) libraryMatches.set(entry.id, entry);
  const catalogSongs = search.songs.filter((song) => {
    const entry = findEntry(entries, song);
    if (entry) libraryMatches.set(entry.id, entry);
    return !entry;
  });

  const addCustom = () => {
    const parsed = parseCustomQuery(query);
    const existing = parsed.artist ? findEntry(entries, { source: 'custom', ...parsed }) : undefined;
    setSelection(existing ? selectionForEntry(existing) : { kind: 'draft', ...parsed });
  };

  const done = search.isSettled || search.isError;
  const nothingFound = done && libraryMatches.size === 0 && catalogSongs.length === 0;

  return (
    <Screen title="Log" action={<ProfileButton />}>
      <TextField
        type="search"
        aria-label="Search for a song"
        placeholder="Song or artist"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        autoFocus
        autoCorrect="off"
        autoCapitalize="none"
        enterKeyHint="search"
      />

      <div className="mt-5 flex flex-col gap-6 pb-6">
        {query.length < 2 ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center text-muted">
            <Search className="size-10 text-brand" aria-hidden />
            <p>Search for a song you know, are learning, or want to learn.</p>
          </div>
        ) : null}

        {libraryMatches.size > 0 ? (
          <Section title="In your list">
            {[...libraryMatches.values()].map((entry) => (
              <SongRow
                key={entry.id}
                title={entry.song.title}
                artist={entry.song.artist}
                coverUrl={entry.song.cover_url}
                status={entry.status}
                onClick={() => setSelection(selectionForEntry(entry))}
              />
            ))}
          </Section>
        ) : null}

        {catalogSongs.length > 0 ? (
          <Section title="Songs">
            {catalogSongs.map((song) => (
              <SongRow
                key={song.mbid}
                title={song.title}
                artist={song.artist}
                coverUrl={song.coverUrl}
                onClick={() => setSelection({ kind: 'candidate', candidate: song })}
              />
            ))}
          </Section>
        ) : null}

        {search.isSearching ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Searching…
          </p>
        ) : null}

        {nothingFound ? (
          // The one case where adding your own song is the main thing to do.
          <div className="flex flex-col items-center gap-4 pt-10 text-center">
            <p className="text-muted">
              {search.isError ? "Couldn't reach the song catalog." : `No matches for “${query}”.`}
            </p>
            <Button label={`Add “${query}” yourself`} onClick={addCustom} />
          </div>
        ) : done ? (
          <button type="button" onClick={addCustom} className="min-h-11 text-center text-sm text-muted">
            {search.isError ? "Couldn't reach the song catalog. " : "Can't find it? "}
            <span className="underline underline-offset-2">Add “{query}”</span>
          </button>
        ) : null}
      </div>

      <SongSheet selection={selection} onSelect={setSelection} onClose={() => setSelection(null)} />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}
