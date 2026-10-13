import { useState } from 'react';

import { Chip, CoverArt, Sheet } from '@/components/ui';
import { feelLabels, formatSeconds } from '@/lib/practice';
import { useDeleteSession, useLibrary } from '@/lib/queries';
import { dayLabel, type PracticeSession } from '@/lib/stats';

import { sessionEntries, sessionTime } from './SessionCard';

type SessionSheetProps = {
  session: PracticeSession | null;
  onClose: () => void;
};

// One logged session in full, and the way to delete it.
export function SessionSheet({ session, onClose }: SessionSheetProps) {
  // Keep the last session rendered while the sheet animates closed.
  const [shown, setShown] = useState(session);
  if (session && session !== shown) setShown(session);

  return (
    <Sheet
      open={session !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Practice session"
    >
      {shown ? <SessionBody key={shown.id} session={shown} onClose={onClose} /> : null}
    </Sheet>
  );
}

function SessionBody({ session, onClose }: { session: PracticeSession; onClose: () => void }) {
  const library = useLibrary();
  const deleteSession = useDeleteSession();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const entries = sessionEntries(session, library.data ?? []);
  // An optimistic session has no row to delete yet.
  const isSaved = !session.id.startsWith('pending-');

  const remove = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteSession.mutate(session.id);
    onClose();
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-text">{dayLabel(session.practiced_at, new Date())}</h2>
        <p className="text-sm text-muted">
          {new Date(session.practiced_at).toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}{' '}
          · {sessionTime(session)}
        </p>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-bold text-text tabular-nums">{formatSeconds(session.duration_sec)}</p>
          {session.feel ? (
            <Chip label={feelLabels[session.feel]} tone={session.feel === 'great' ? 'selected' : 'neutral'} />
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Worked on</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">No songs logged for this session.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
              <CoverArt url={entry.song.cover_url} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold text-text">{entry.song.title}</span>
                <span className="truncate text-sm text-muted">{entry.song.artist}</span>
              </span>
            </div>
          ))
        )}
      </section>

      {isSaved ? (
        <button
          type="button"
          onClick={remove}
          className={`h-11 text-sm font-medium ${confirmingDelete ? 'text-danger' : 'text-muted'}`}
        >
          {confirmingDelete ? 'Tap again to delete this session' : 'Delete session'}
        </button>
      ) : null}
    </div>
  );
}
