import { Camera } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CoverArt, Sheet, TextField } from '@/components/ui';
import type { SongStatus } from '@/lib/database.types';
import {
  defaultsForStatus,
  findEntry,
  formatDuration,
  type LibraryEntry,
  type SongCandidate,
} from '@/lib/library';
import {
  isPendingEntry,
  useLibrary,
  useLogSong,
  useRemoveEntry,
  useSessions,
  useSetCover,
  useUpdateEntry,
} from '@/lib/queries';
import { useActiveSession } from '@/lib/activeSession';
import { react } from '@/lib/mascotEvents';
import { formatMinutes } from '@/lib/practice';
import { customSongSchema } from '@/lib/schemas/entry';
import { relativeDay, songTotals } from '@/lib/stats';

import { LogButton } from './LogButton';
import { SongNotes } from './SongNotes';
import { SongResources } from './SongResources';

// What the sheet is showing: a library entry, a song that may not be logged
// yet, or a custom song the user is still naming.
export type SongSelection =
  | { kind: 'entry'; entryId: string }
  | { kind: 'candidate'; candidate: SongCandidate }
  | { kind: 'draft'; title: string; artist: string };

// A pending entry has no stable id yet, so follow it by its song instead.
export function selectionForEntry(entry: LibraryEntry): SongSelection {
  if (!isPendingEntry(entry)) return { kind: 'entry', entryId: entry.id };

  const { song } = entry;
  return {
    kind: 'candidate',
    candidate: song.mbid
      ? {
          source: 'musicbrainz',
          mbid: song.mbid,
          title: song.title,
          artist: song.artist,
          album: song.album,
          coverUrl: song.cover_url,
          durationMs: song.duration_ms,
          year: null,
        }
      : { source: 'custom', title: song.title, artist: song.artist },
  };
}

function selectionKey(selection: SongSelection): string {
  if (selection.kind === 'entry') return `entry:${selection.entryId}`;
  if (selection.kind === 'draft') return 'draft';
  const { candidate } = selection;
  return candidate.source === 'musicbrainz'
    ? `mbid:${candidate.mbid}`
    : `custom:${candidate.title}|${candidate.artist}`;
}

type SongSheetProps = {
  selection: SongSelection | null;
  onSelect: (selection: SongSelection) => void;
  onClose: () => void;
};

// The song "mini page": everything known about a song, the Log button, and,
// once it is logged, its practice totals, resources and notes. Adding and editing are the same sheet.
export function SongSheet({ selection, onSelect, onClose }: SongSheetProps) {
  const library = useLibrary();
  const logSong = useLogSong();
  const updateEntry = useUpdateEntry();
  const removeEntry = useRemoveEntry();

  // Keep the last song rendered while the sheet animates closed.
  const [shown, setShown] = useState(selection);
  const [failed, setFailed] = useState(false);
  if (selection && selection !== shown) {
    setShown(selection);
    setFailed(false);
  }

  const entries = library.data ?? [];
  const onError = () => setFailed(true);

  const log = (candidate: SongCandidate, status: SongStatus) => {
    setFailed(false);
    logSong.mutate({ candidate, status }, { onError, onSuccess: () => react('songAdded') });
  };
  const setStatus = (entry: LibraryEntry, status: SongStatus) => {
    setFailed(false);
    updateEntry.mutate(
      { id: entry.id, patch: { status, ...defaultsForStatus(status) } },
      { onError, onSuccess: () => status === 'learned' && react('songLearned') },
    );
  };

  let body = null;
  if (shown?.kind === 'draft') {
    body = (
      <DraftBody
        key="draft"
        initial={shown}
        onLog={(candidate, status) => {
          // The same song may already be in the library; update it instead of adding a twin.
          const existing = findEntry(entries, candidate);
          if (existing) {
            if (!isPendingEntry(existing)) setStatus(existing, status);
            onSelect(selectionForEntry(existing));
          } else {
            log(candidate, status);
            onSelect({ kind: 'candidate', candidate });
          }
        }}
      />
    );
  } else if (shown) {
    const candidate = shown.kind === 'candidate' ? shown.candidate : null;
    const entry =
      shown.kind === 'entry'
        ? entries.find((other) => other.id === shown.entryId)
        : findEntry(entries, shown.candidate);

    body = (
      <SongBody
        key={selectionKey(shown)}
        entry={entry}
        candidate={candidate}
        onPick={(status) => {
          if (entry) setStatus(entry, status);
          else if (candidate) log(candidate, status);
        }}
        onRemove={() => {
          if (entry) removeEntry.mutate(entry);
          onClose();
        }}
      />
    );
  }

  return (
    <Sheet
      open={selection !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Song"
    >
      {body}
      {failed ? (
        <p className="mt-3 text-sm text-danger">Couldn't save. Check your connection and try again.</p>
      ) : null}
    </Sheet>
  );
}

type SongBodyProps = {
  entry: LibraryEntry | undefined;
  candidate: SongCandidate | null;
  onPick: (status: SongStatus) => void;
  onRemove: () => void;
};

function SongBody({ entry, candidate, onPick, onRemove }: SongBodyProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const setCover = useSetCover();

  const catalog = candidate?.source === 'musicbrainz' ? candidate : null;
  const song = entry
    ? {
        title: entry.song.title,
        artist: entry.song.artist,
        album: entry.song.album,
        coverUrl: entry.song.cover_url,
        durationMs: entry.song.duration_ms,
      }
    : {
        title: candidate?.title ?? '',
        artist: candidate?.artist ?? '',
        album: catalog?.album ?? null,
        coverUrl: catalog?.coverUrl ?? null,
        durationMs: catalog?.durationMs ?? null,
      };
  const facts = [song.album, catalog?.year, song.durationMs ? formatDuration(song.durationMs) : null].filter(
    Boolean,
  );
  const isSaved = entry !== undefined && !isPendingEntry(entry);

  // Opening or adding a song while a session runs counts it as practiced.
  const { session, touch } = useActiveSession();
  const entryId = isSaved ? entry.id : null;
  const sessionRunning = session !== null;
  useEffect(() => {
    if (entryId && sessionRunning) touch(entryId);
  }, [entryId, sessionRunning, touch]);

  // The entry was removed (or never loaded); the sheet is on its way out.
  if (!entry && !candidate) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {isSaved && entry.song.source === 'custom' ? (
          // Custom songs have no catalog art, so the user can pick their own.
          <label
            aria-busy={setCover.isPending}
            className={`relative shrink-0 cursor-pointer active:opacity-80 ${setCover.isPending ? 'opacity-60' : ''}`}
          >
            <CoverArt url={song.coverUrl} size="lg" />
            <span className="absolute right-1.5 bottom-1.5 flex size-8 items-center justify-center rounded-full border border-border bg-surface text-text">
              <Camera className="size-4" aria-hidden />
            </span>
            <input
              type="file"
              accept="image/*"
              aria-label={song.coverUrl ? 'Change cover image' : 'Add a cover image'}
              disabled={setCover.isPending}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Cleared so picking the same photo again still fires a change.
                event.target.value = '';
                if (file) setCover.mutate({ song: entry.song, file });
              }}
            />
          </label>
        ) : (
          <CoverArt url={song.coverUrl} size="lg" />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl leading-tight font-bold text-text">{song.title}</h2>
          <p className="text-base text-muted">{song.artist}</p>
          {facts.length > 0 ? <p className="text-sm text-muted">{facts.join(' · ')}</p> : null}
        </div>
      </div>

      {setCover.isError ? (
        <p className="text-sm text-danger">Couldn't save the cover. Check your connection and try again.</p>
      ) : null}

      <LogButton
        status={entry?.status ?? null}
        disabled={entry !== undefined && !isSaved}
        onPick={onPick}
      />

      {isSaved ? (
        <>
          <div className="flex flex-col gap-5 border-t border-border pt-4">
            <SongTotals entryId={entry.id} />
            <SongResources entry={entry} />
            <SongNotes entry={entry} />
          </div>

          <button
            type="button"
            onClick={() => (confirmingRemove ? onRemove() : setConfirmingRemove(true))}
            className={`h-11 text-sm font-medium ${confirmingRemove ? 'text-danger' : 'text-muted'}`}
          >
            {confirmingRemove ? 'Tap again to remove it with its resources and notes' : 'Remove from My List'}
          </button>
        </>
      ) : null}
    </div>
  );
}

// What practice has added up to for this song: sessions, time, and when last.
function SongTotals({ entryId }: { entryId: string }) {
  const sessions = useSessions();
  const totals = songTotals(sessions.data ?? []).get(entryId);

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Practice</h3>
      <p className="text-sm text-text">
        {totals
          ? `${totals.sessions} ${totals.sessions === 1 ? 'session' : 'sessions'} · ${formatMinutes(Math.round(totals.minutes))} · last ${relativeDay(totals.lastPlayed, new Date())}`
          : 'Not practiced yet.'}
      </p>
    </div>
  );
}

type DraftBodyProps = {
  initial: { title: string; artist: string };
  onLog: (candidate: SongCandidate, status: SongStatus) => void;
};

// A song the catalog doesn't have: same layout as any other song, with the
// title and artist typed in instead of looked up.
function DraftBody({ initial, onLog }: DraftBodyProps) {
  const [title, setTitle] = useState(initial.title);
  const [artist, setArtist] = useState(initial.artist);
  const parsed = customSongSchema.safeParse({ title, artist });
  const tooLong = !parsed.success && title.trim() !== '' && artist.trim() !== '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <CoverArt url={null} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <TextField
            aria-label="Title"
            placeholder="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus={initial.title === ''}
          />
          <TextField
            aria-label="Artist"
            placeholder="Artist"
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            autoFocus={initial.title !== '' && initial.artist === ''}
            error={tooLong ? parsed.error.issues[0]?.message : undefined}
          />
        </div>
      </div>

      <LogButton
        status={null}
        disabled={!parsed.success}
        onPick={(status) => {
          if (parsed.success) onLog({ source: 'custom', ...parsed.data }, status);
        }}
      />
    </div>
  );
}
