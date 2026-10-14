import { useState, type FormEvent } from 'react';

import { Chip, TextField } from '@/components/ui';
import { hasEntry, JAMLIST_NAME_MAX, jamlistEntryIds, toggleId } from '@/lib/jamlists';
import type { LibraryEntry } from '@/lib/library';
import { useCreateJamlist, useJamlists, useSetJamlistSongs } from '@/lib/queries';

// Which jamlists a song is in, as chips to tap in and out, plus a new one.
export function SongJamlists({ entry }: { entry: LibraryEntry }) {
  const jamlists = useJamlists();
  const setSongs = useSetJamlistSongs();
  const create = useCreateJamlist();
  const [naming, setNaming] = useState<string | null>(null);

  const lists = jamlists.data ?? [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!naming?.trim()) return;
    create.mutate({ name: naming, entryIds: [entry.id] }, { onSuccess: () => setNaming(null) });
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Jamlists</h3>
      <div className="flex flex-wrap gap-2">
        {lists.map((jamlist) => {
          const inIt = hasEntry(jamlist, entry.id);
          return (
            <Chip
              key={jamlist.id}
              label={jamlist.name}
              tone={inIt ? 'selected' : 'neutral'}
              pressed={inIt}
              onClick={() =>
                setSongs.mutate({ id: jamlist.id, entryIds: toggleId(jamlistEntryIds(jamlist), entry.id) })
              }
            />
          );
        })}
        {naming === null ? <Chip label="+ New" tone="neutral" onClick={() => setNaming('')} /> : null}
      </div>
      {naming !== null ? (
        <form onSubmit={submit} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <TextField
              aria-label="New jamlist name"
              placeholder="Jamlist name"
              value={naming}
              maxLength={JAMLIST_NAME_MAX}
              onChange={(event) => setNaming(event.target.value)}
              enterKeyHint="done"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!naming.trim() || create.isPending}
            className="h-12 px-2 text-sm font-semibold text-text disabled:opacity-50"
          >
            Add
          </button>
          <button type="button" onClick={() => setNaming(null)} className="h-12 px-1 text-sm font-medium text-muted">
            Cancel
          </button>
        </form>
      ) : null}
      {setSongs.isError || create.isError ? (
        <p className="text-sm text-danger">Couldn't save. Check your connection and try again.</p>
      ) : null}
    </div>
  );
}
