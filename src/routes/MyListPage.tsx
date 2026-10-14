import { ListMusic } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { AccountButton } from '@/components/AccountButton';
import { SongRow } from '@/components/SongRow';
import { selectionForEntry, SongSheet, type SongSelection } from '@/components/SongSheet';
import { Button, Chip, LoadError, Screen } from '@/components/ui';
import type { SongStatus } from '@/lib/database.types';
import { allStatuses, statusLabels } from '@/lib/library';
import { useLibrary } from '@/lib/queries';

export function MyListPage() {
  const navigate = useNavigate();
  const library = useLibrary();
  const [filter, setFilter] = useState<SongStatus | null>(null);
  const [selection, setSelection] = useState<SongSelection | null>(null);

  const entries = library.data ?? [];
  const visible = filter ? entries.filter((entry) => entry.status === filter) : entries;
  const count = (status: SongStatus) => entries.filter((entry) => entry.status === status).length;

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
          {/* Bleeds to the screen edges so the pills scroll under the page padding. */}
          <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
            <Chip
              label={`All ${entries.length}`}
              tone={filter === null ? 'selected' : 'neutral'}
              pressed={filter === null}
              onClick={() => setFilter(null)}
            />
            {allStatuses.map((status) => (
              <Chip
                key={status}
                label={`${statusLabels[status]} ${count(status)}`}
                tone={filter === status ? 'selected' : 'neutral'}
                pressed={filter === status}
                onClick={() => setFilter(status)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2 pb-6">
            {visible.map((entry, index) => (
              <SongRow
                key={entry.id}
                index={index}
                title={entry.song.title}
                artist={entry.song.artist}
                coverUrl={entry.song.cover_url}
                status={entry.status}
                onClick={() => setSelection(selectionForEntry(entry))}
              />
            ))}
            {visible.length === 0 && filter ? (
              <p className="pt-10 text-center text-muted">Nothing {statusLabels[filter].toLowerCase()} yet.</p>
            ) : null}
          </div>
        </>
      )}

      <SongSheet selection={selection} onSelect={setSelection} onClose={() => setSelection(null)} />
    </Screen>
  );
}
