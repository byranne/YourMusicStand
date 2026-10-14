import { Camera, Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button, CoverArt, Sheet, TextField } from '@/components/ui';
import { useActiveSession } from '@/lib/activeSession';
import {
  JAMLIST_NAME_MAX,
  jamlistCover,
  jamlistEntries,
  jamlistEntryIds,
  moveId,
  songCountLabel,
  toggleId,
  type Jamlist,
} from '@/lib/jamlists';
import type { LibraryEntry } from '@/lib/library';
import {
  isPendingEntry,
  useCreateJamlist,
  useDeleteJamlist,
  useJamlists,
  useLibrary,
  useRenameJamlist,
  useSessions,
  useSetJamlistCover,
  useSetJamlistSongs,
} from '@/lib/queries';

import { ImageCropper } from './ImageCropper';
import { SongPicker } from './SongPicker';

// A jamlist being made (named first) or an existing one.
export type JamlistSelection = { kind: 'new' } | { kind: 'jamlist'; id: string };

type JamlistSheetProps = {
  selection: JamlistSelection | null;
  onSelect: (selection: JamlistSelection) => void;
  onClose: () => void;
};

// One jamlist: its cover, songs in order, Start practice, and editing.
export function JamlistSheet({ selection, onSelect, onClose }: JamlistSheetProps) {
  const jamlists = useJamlists();
  // Keep the last jamlist rendered while the sheet animates closed.
  const [shown, setShown] = useState(selection);
  if (selection && selection !== shown) setShown(selection);

  const jamlist = shown?.kind === 'jamlist' ? jamlists.data?.find((list) => list.id === shown.id) : undefined;

  return (
    <Sheet
      open={selection !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Jamlist"
    >
      {shown?.kind === 'new' ? (
        <NewJamlist onCreated={(created) => onSelect({ kind: 'jamlist', id: created.id })} />
      ) : jamlist ? (
        <JamlistBody key={jamlist.id} jamlist={jamlist} onClose={onClose} />
      ) : null}
    </Sheet>
  );
}

function NewJamlist({ onCreated }: { onCreated: (jamlist: Jamlist) => void }) {
  const create = useCreateJamlist();
  const [name, setName] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name }, { onSuccess: onCreated });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-text">New jamlist</h2>
      <TextField
        label="Name"
        placeholder="Campfire set, Warm-ups…"
        value={name}
        maxLength={JAMLIST_NAME_MAX}
        onChange={(event) => setName(event.target.value)}
        enterKeyHint="done"
        autoFocus
      />
      {create.isError ? (
        <p className="text-sm text-danger">Couldn't create it. Check your connection and try again.</p>
      ) : null}
      <Button type="submit" label="Create" disabled={!name.trim()} loading={create.isPending} />
    </form>
  );
}

function JamlistBody({ jamlist, onClose }: { jamlist: Jamlist; onClose: () => void }) {
  const library = useLibrary();
  const sessions = useSessions();
  const setSongs = useSetJamlistSongs();
  const setCover = useSetJamlistCover();
  const rename = useRenameJamlist();
  const remove = useDeleteJamlist();
  const { session, startWith } = useActiveSession();

  const [picking, setPicking] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pickedCover, setPickedCover] = useState<File | null>(null);

  const all = library.data ?? [];
  const entries = jamlistEntries(jamlist, all);
  // Only entries still in the library: one removed elsewhere drops out on the next write.
  // Until the library has loaded, keep every id so an early edit can't drop any.
  const ids = library.data ? entries.map((entry) => entry.id) : jamlistEntryIds(jamlist);
  const saveIds = (next: string[]) => setSongs.mutate({ id: jamlist.id, entryIds: next });
  const failed = setSongs.isError || setCover.isError || rename.isError || remove.isError;

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    if (naming?.trim() && naming.trim() !== jamlist.name) rename.mutate({ id: jamlist.id, name: naming });
    setNaming(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <label
          aria-busy={setCover.isPending}
          className={`relative shrink-0 cursor-pointer active:opacity-80 ${setCover.isPending ? 'opacity-60' : ''}`}
        >
          <CoverArt url={jamlistCover(jamlist, entries)} size="lg" />
          <span className="absolute right-1.5 bottom-1.5 flex size-8 items-center justify-center rounded-full border border-border bg-surface text-text">
            <Camera className="size-4" aria-hidden />
          </span>
          <input
            type="file"
            accept="image/*"
            aria-label="Change the jamlist's cover"
            disabled={setCover.isPending}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Cleared so picking the same photo again still fires a change.
              event.target.value = '';
              if (file) setPickedCover(file);
            }}
          />
        </label>
        <ImageCropper
          file={pickedCover}
          shape="square"
          title="Crop the cover"
          onCancel={() => setPickedCover(null)}
          onConfirm={(crop) => {
            if (pickedCover) setCover.mutate({ jamlist, image: { file: pickedCover, crop } });
            setPickedCover(null);
          }}
        />

        {naming !== null ? (
          <form onSubmit={saveName} className="flex min-w-0 flex-1 flex-col gap-2">
            <TextField
              aria-label="Jamlist name"
              value={naming}
              maxLength={JAMLIST_NAME_MAX}
              onChange={(event) => setNaming(event.target.value)}
              enterKeyHint="done"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="submit" className="h-11 px-1 text-sm font-semibold text-text">
                Save
              </button>
              <button type="button" onClick={() => setNaming(null)} className="h-11 px-1 text-sm font-medium text-muted">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <h2 className="w-full text-xl leading-tight font-bold break-words text-text">{jamlist.name}</h2>
            <p className="text-sm text-muted">{songCountLabel(entries.length)}</p>
            <button
              type="button"
              onClick={() => setNaming(jamlist.name)}
              className="-ml-1 h-11 px-1 text-sm font-medium text-muted"
            >
              Rename
            </button>
          </div>
        )}
      </div>

      {jamlist.cover_path ? (
        <button
          type="button"
          disabled={setCover.isPending}
          onClick={() => setCover.mutate({ jamlist, image: null })}
          className="-mt-3 h-11 self-start text-sm font-medium text-muted"
        >
          Use the first song's cover
        </button>
      ) : null}

      <Button
        label={session ? 'Add to this session' : 'Start practice'}
        disabled={entries.length === 0}
        onClick={() => {
          startWith(ids);
          onClose();
        }}
      />

      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Songs</h3>
          <button
            type="button"
            onClick={() => setPicking((value) => !value)}
            className="h-11 px-1 text-sm font-semibold text-text"
          >
            {picking ? 'Done' : 'Add songs'}
          </button>
        </div>

        {picking ? (
          <SongPicker
            entries={all.filter((entry) => !isPendingEntry(entry))}
            sessions={sessions.data ?? []}
            pinned={ids}
            renderRow={(entry) => (
              <PickRow
                key={entry.id}
                entry={entry}
                picked={ids.includes(entry.id)}
                onToggle={() => saveIds(toggleId(ids, entry.id))}
              />
            )}
          />
        ) : entries.length === 0 ? (
          <p className="py-2 text-sm text-muted">No songs yet. Tap Add songs to pick some from your list.</p>
        ) : (
          entries.map((entry, index) => (
            <OrderRow
              key={entry.id}
              entry={entry}
              first={index === 0}
              last={index === entries.length - 1}
              onMove={(delta) => saveIds(moveId(ids, entry.id, delta))}
              onRemove={() => saveIds(ids.filter((id) => id !== entry.id))}
            />
          ))
        )}
      </section>

      {failed ? <p className="text-sm text-danger">Couldn't save. Check your connection and try again.</p> : null}

      <button
        type="button"
        onClick={() => {
          if (confirmingDelete) {
            remove.mutate(jamlist);
            onClose();
          } else {
            setConfirmingDelete(true);
          }
        }}
        className={`h-11 text-sm font-medium ${confirmingDelete ? 'text-danger' : 'text-muted'}`}
      >
        {confirmingDelete ? 'Tap again to delete it (the songs stay in My List)' : 'Delete jamlist'}
      </button>
    </div>
  );
}

const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90 disabled:opacity-30';

type OrderRowProps = {
  entry: LibraryEntry;
  first: boolean;
  last: boolean;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
};

function OrderRow({ entry, first, last, onMove, onRemove }: OrderRowProps) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border bg-surface py-1 pr-1 pl-3">
      <CoverArt url={entry.song.cover_url} size="xs" />
      <span className="ml-2 flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-text">{entry.song.title}</span>
        <span className="truncate text-xs text-muted">{entry.song.artist}</span>
      </span>
      <button
        type="button"
        aria-label={`Move ${entry.song.title} up`}
        disabled={first}
        onClick={() => onMove(-1)}
        className={iconButton}
      >
        <ChevronUp className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Move ${entry.song.title} down`}
        disabled={last}
        onClick={() => onMove(1)}
        className={iconButton}
      >
        <ChevronDown className="size-5" aria-hidden />
      </button>
      <button type="button" aria-label={`Take ${entry.song.title} out`} onClick={onRemove} className={iconButton}>
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

function PickRow({ entry, picked, onToggle }: { entry: LibraryEntry; picked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left active:opacity-80 ${
        picked ? 'border-transparent bg-brand-soft text-on-brand-soft' : 'border-border bg-surface text-text'
      }`}
    >
      <CoverArt url={entry.song.cover_url} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{entry.song.title}</span>
        <span className={`truncate text-sm ${picked ? '' : 'text-muted'}`}>{entry.song.artist}</span>
      </span>
      {picked ? <Check className="mr-1 size-5 shrink-0" aria-hidden /> : null}
    </button>
  );
}
