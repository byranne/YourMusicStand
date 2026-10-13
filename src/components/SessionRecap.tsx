import { Check, Minus, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button, Chip, CoverArt, Sheet } from '@/components/ui';
import type { PracticeFeel } from '@/lib/database.types';
import type { LibraryEntry } from '@/lib/library';
import {
  elapsedSeconds,
  feelLabels,
  formatSeconds,
  MAX_SECONDS,
  recapOrder,
  type ActiveSession,
} from '@/lib/practice';
import { isPendingEntry, useLibrary, useSaveSession } from '@/lib/queries';

const STEP_MIN = 5;
const STEP_SEC = STEP_MIN * 60;
const PAST_MINUTES = [15, 30, 45, 60];
const feels: PracticeFeel[] = ['rough', 'okay', 'great'];

type SessionRecapProps = (
  | {
      // Closes out the running session.
      kind: 'finish';
      session: ActiveSession;
      // When it really ended, if that was earlier than now (it was abandoned).
      endAt?: Date;
      // The user threw the session away instead of saving it.
      onDiscard: () => void;
    }
  // Logs a session that was never started in the app.
  | { kind: 'past' }
) & {
  onClose: () => void;
  onSaved: () => void;
};

// Mount it to open it and unmount it to close it, so the form starts fresh each time.
export function SessionRecap(props: SessionRecapProps) {
  const { onClose, onSaved } = props;
  const session = props.kind === 'finish' ? props.session : null;
  const library = useLibrary();
  const save = useSaveSession();

  const [seconds, setSeconds] = useState(() =>
    props.kind === 'finish' ? elapsedSeconds(props.session, props.endAt ?? new Date()) : 30 * 60,
  );
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(session?.touched));
  const [feel, setFeel] = useState<PracticeFeel | null>(null);
  const [yesterday, setYesterday] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [failed, setFailed] = useState(false);

  // Pending (optimistic) entries have no row id yet, so they can't be attached.
  const entries = recapOrder(
    (library.data ?? []).filter((entry) => !isPendingEntry(entry)),
    session?.touched ?? [],
  );
  // Keep the list short enough that Save stays in reach: the likely songs
  // first, the whole library one tap away.
  const likely = entries.filter((entry) => picked.has(entry.id) || entry.status === 'learning');
  const visible = showAll || likely.length === 0 ? entries : likely;

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const submit = async () => {
    const now = new Date();
    const noonYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);

    setFailed(false);
    try {
      await save.mutateAsync({
        practicedAt: session ? session.startedAt : (yesterday ? noonYesterday : now).toISOString(),
        durationSec: seconds,
        feel,
        // Only songs that still exist: one opened earlier may have been removed since.
        userSongIds: entries.filter((entry) => picked.has(entry.id)).map((entry) => entry.id),
      });
      onSaved();
    } catch {
      setFailed(true);
    }
  };

  const discard = () => {
    if (!confirmingDiscard) setConfirmingDiscard(true);
    else if (props.kind === 'finish') props.onDiscard();
    else onClose();
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={props.kind === 'finish' ? 'Finish practice' : 'Add a past session'}
    >
      <div className="flex flex-col gap-6">
        {props.kind === 'past' ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-text">Add a past session</h2>
            <div className="flex gap-2">
              <PickChip label="Today" picked={!yesterday} onPick={() => setYesterday(false)} />
              <PickChip label="Yesterday" picked={yesterday} onPick={() => setYesterday(true)} />
            </div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
              {PAST_MINUTES.map((value) => (
                <PickChip
                  key={value}
                  label={`${value} min`}
                  picked={seconds === value * 60}
                  onPick={() => setSeconds(value * 60)}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="flex flex-col items-center gap-2">
            <h2 className="text-sm font-medium text-muted">You played for</h2>
            {editingTime ? (
              <DurationInput
                seconds={seconds}
                onCommit={(value) => {
                  setSeconds(value);
                  setEditingTime(false);
                }}
              />
            ) : (
              <div className="flex items-center gap-4">
                <StepButton
                  label={`${STEP_MIN} minutes less`}
                  onClick={() => setSeconds((value) => (value > STEP_SEC ? value - STEP_SEC : value))}
                >
                  <Minus className="size-5" aria-hidden />
                </StepButton>
                <button
                  type="button"
                  aria-label={`${formatSeconds(seconds)}, tap to type a time`}
                  onClick={() => setEditingTime(true)}
                  className="h-11 min-w-32 text-center text-3xl font-bold text-text tabular-nums underline decoration-border decoration-dotted decoration-2 underline-offset-8"
                >
                  {formatSeconds(seconds)}
                </button>
                <StepButton
                  label={`${STEP_MIN} minutes more`}
                  onClick={() => setSeconds((value) => Math.min(MAX_SECONDS, value + STEP_SEC))}
                >
                  <Plus className="size-5" aria-hidden />
                </StepButton>
              </div>
            )}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Worked on</h3>
          {entries.length === 0 ? (
            <p className="text-sm text-muted">Your songs show up here once you add some.</p>
          ) : (
            visible.map((entry) => (
              <SongPick
                key={entry.id}
                entry={entry}
                picked={picked.has(entry.id)}
                onToggle={() => toggle(entry.id)}
              />
            ))
          )}
          {visible.length < entries.length ? (
            <button type="button" onClick={() => setShowAll(true)} className="h-11 text-sm font-medium text-muted">
              Show all {entries.length} songs
            </button>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">How did it go?</h3>
          <div className="flex gap-2">
            {feels.map((value) => (
              <PickChip
                key={value}
                label={feelLabels[value]}
                picked={feel === value}
                onPick={() => setFeel(feel === value ? null : value)}
              />
            ))}
          </div>
        </section>

        {failed ? (
          <p className="text-sm text-danger">Couldn't save. Check your connection and try again.</p>
        ) : null}

        <div className="flex flex-col gap-1">
          <Button label="Save" onClick={submit} loading={save.isPending} />
          <button
            type="button"
            onClick={discard}
            className={`h-11 text-sm font-medium ${confirmingDiscard ? 'text-danger' : 'text-muted'}`}
          >
            {confirmingDiscard ? 'Tap again to discard' : 'Discard'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function PickChip({ label, picked, onPick }: { label: string; picked: boolean; onPick: () => void }) {
  return <Chip label={label} tone={picked ? 'selected' : 'neutral'} pressed={picked} onClick={onPick} />;
}

// Typing an exact time as minutes and seconds. It commits when focus leaves
// both fields, so tapping Save keeps the value.
function DurationInput({ seconds, onCommit }: { seconds: number; onCommit: (seconds: number) => void }) {
  const [minutesDraft, setMinutesDraft] = useState(String(Math.floor(seconds / 60)));
  const [secondsDraft, setSecondsDraft] = useState(String(seconds % 60).padStart(2, '0'));

  const commit = () => {
    const total = (Number.parseInt(minutesDraft, 10) || 0) * 60 + Math.min(59, Number.parseInt(secondsDraft, 10) || 0);
    onCommit(total < 1 ? seconds : Math.min(MAX_SECONDS, total));
  };

  const field = (label: string, value: string, onChange: (value: string) => void, maxLength: number, focus: boolean) => (
    <input
      autoFocus={focus}
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, maxLength))}
      onFocus={(event) => event.target.select()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
      }}
      className="h-11 w-20 rounded-xl border border-border bg-surface text-center tabular-nums outline-none focus:border-brand"
    />
  );

  return (
    <div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) commit();
      }}
      className="flex items-baseline justify-center gap-2 text-3xl font-bold text-text"
    >
      {field('Minutes played', minutesDraft, setMinutesDraft, 4, true)}
      <span className="text-muted">:</span>
      {field('Seconds played', secondsDraft, setSecondsDraft, 2, false)}
    </div>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border border-border bg-surface text-text"
    >
      {children}
    </button>
  );
}

function SongPick({ entry, picked, onToggle }: { entry: LibraryEntry; picked: boolean; onToggle: () => void }) {
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
