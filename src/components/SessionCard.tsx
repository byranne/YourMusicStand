import { Link } from 'react-router';

import { Chip, CoverArt, stagger } from '@/components/ui';
import type { LibraryEntry } from '@/lib/library';
import { feelLabels, formatSeconds } from '@/lib/practice';
import { useLibrary } from '@/lib/queries';
import { dayLabel, type PracticeSession } from '@/lib/stats';

const MAX_COVERS = 3;

// The session's songs that are still in the library, in library order.
export function sessionEntries(session: PracticeSession, library: LibraryEntry[]): LibraryEntry[] {
  const ids = new Set(session.songs.map((song) => song.user_song_id));
  return library.filter((entry) => ids.has(entry.id));
}

export function sessionTime(session: PracticeSession): string {
  return new Date(session.practiced_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

type SessionCardProps = {
  session: PracticeSession;
  // Position in its list, so cards cascade in one after another.
  index?: number;
} & ({ to: string } | { onClick: () => void });

// One row of practice history: when, how long, how it felt and what was played.
export function SessionCard(props: SessionCardProps) {
  const { session } = props;
  const library = useLibrary();
  const entries = sessionEntries(session, library.data ?? []);
  const className =
    'flex w-full animate-rise flex-col gap-2 rounded-2xl border border-border bg-surface p-3 text-left transition-transform active:scale-[0.98] active:opacity-80';
  const style = stagger(props.index ?? 0);

  const content = (
    <>
      <span className="flex items-center gap-2">
        <span className="font-semibold text-text">{dayLabel(session.practiced_at, new Date())}</span>
        <span className="text-sm text-muted">{sessionTime(session)}</span>
        <span className="ml-auto text-sm font-semibold text-text tabular-nums">
          {formatSeconds(session.duration_sec)}
        </span>
        {session.feel ? (
          <Chip label={feelLabels[session.feel]} tone={session.feel === 'great' ? 'selected' : 'neutral'} />
        ) : null}
      </span>
      <span className="flex min-h-8 items-center gap-2">
        {entries.length === 0 ? (
          <span className="text-sm text-muted">No songs logged</span>
        ) : (
          <>
            <span className="flex shrink-0 -space-x-2">
              {entries.slice(0, MAX_COVERS).map((entry) => (
                <span key={entry.id} className="rounded-lg ring-2 ring-surface">
                  <CoverArt url={entry.song.cover_url} size="xs" />
                </span>
              ))}
            </span>
            <span className="truncate text-sm text-muted">
              {entries[0].song.title}
              {entries.length > 1 ? ` +${entries.length - 1}` : ''}
            </span>
          </>
        )}
      </span>
    </>
  );

  return 'to' in props ? (
    <Link to={props.to} className={className} style={style}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={props.onClick} className={className} style={style}>
      {content}
    </button>
  );
}
