import { Check, ChevronDown, GraduationCap } from 'lucide-react';
import { useState } from 'react';

import { NoteBurst } from '@/components/NoteBurst';
import { SongPicker } from '@/components/SongPicker';
import { Button, Chip, CoverArt, Sheet, TextField } from '@/components/ui';
import type { PracticeFeel } from '@/lib/database.types';
import { defaultsForStatus, type LibraryEntry } from '@/lib/library';
import {
  adjustSeconds,
  dateInputValue,
  elapsedSeconds,
  feelLabels,
  formatSeconds,
  MAX_SECONDS,
  pastSessionTime,
  recapOrder,
  summarizeTitles,
  type ActiveSession,
} from '@/lib/practice';
import { react } from '@/lib/mascotEvents';
import { isPendingEntry, useLibrary, useSaveSession, useSessions, useUpdateEntry } from '@/lib/queries';
import { crossedMilestone, dayLabel, streakStatus } from '@/lib/stats';

// Minutes each button under the finished session's time adds or takes away.
const ADJUST_MINUTES = [-5, -1, 1, 5];
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
  const updateEntry = useUpdateEntry();
  const sessions = useSessions();

  const [seconds, setSeconds] = useState(() =>
    props.kind === 'finish' ? elapsedSeconds(props.session, props.endAt ?? new Date()) : 30 * 60,
  );
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(session?.touched));
  const [feel, setFeel] = useState<PracticeFeel | null>(null);
  // Ticked songs that Save also marks as learned.
  const [learned, setLearned] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  // The local day a past session is logged on, as a date input writes it.
  const [day, setDay] = useState(() => dateInputValue(new Date()));
  const [otherDay, setOtherDay] = useState(false);
  // The song list stays folded away unless there is nothing ticked yet.
  const [choosing, setChoosing] = useState(() => (session?.touched.length ?? 0) === 0);
  // Songs that stay listed on top, even unticked, so a mis-tap is easy to undo.
  const [pinned, setPinned] = useState<readonly string[]>(() => session?.touched ?? []);
  const [editingTime, setEditingTime] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [failed, setFailed] = useState(false);

  // Pending (optimistic) entries have no row id yet, so they can't be attached.
  const entries = recapOrder(
    (library.data ?? []).filter((entry) => !isPendingEntry(entry)),
    session?.touched ?? [],
  );
  const pickedEntries = entries.filter((entry) => picked.has(entry.id));
  const pickedTitles = pickedEntries.map((entry) => entry.song.title);
  const pickedCount = pickedTitles.length;
  const nowLearned = pickedEntries.filter((entry) => learned.has(entry.id));

  const today = new Date();
  const todayValue = dateInputValue(today);
  const yesterdayValue = dateInputValue(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  const pickDay = (value: string) => {
    setDay(value);
    setOtherDay(false);
  };

  // A past session's length that isn't one of the preset chips was typed in.
  const customLength = !PAST_MINUTES.includes(seconds / 60);

  const flip = (current: ReadonlySet<string>, id: string) => {
    const next = new Set(current);
    if (!next.delete(id)) next.add(id);
    return next;
  };

  const toggle = (id: string) => {
    setPinned((current) => (current.includes(id) ? current : [...current, id]));
    setPicked((current) => flip(current, id));
  };

  const submit = async () => {
    const now = new Date();
    const practicedAt = session ? session.startedAt : pastSessionTime(day, now).toISOString();
    const minutes = Math.round(seconds / 60);
    const earlier = sessions.data ?? [];
    const before = streakStatus(earlier, now);
    const after = streakStatus([...earlier, { practiced_at: practicedAt, duration_min: minutes }], now);
    // The first session of today lights the streak.
    const litStreak = new Date(practicedAt).toDateString() === now.toDateString() && !before.playedToday;
    const milestone = crossedMilestone(
      { sessions: earlier.length, streak: before.count },
      { sessions: earlier.length + 1, streak: after.count },
    );

    setFailed(false);
    setSaving(true);
    try {
      // Statuses go first: setting one twice is harmless, so a failed save can be retried.
      await Promise.all(
        nowLearned
          .filter((entry) => entry.status !== 'learned')
          .map((entry) =>
            updateEntry.mutateAsync({
              id: entry.id,
              patch: { status: 'learned', ...defaultsForStatus('learned') },
            }),
          ),
      );
      await save.mutateAsync({
        practicedAt,
        durationSec: seconds,
        feel,
        // Only songs that still exist: one opened earlier may have been removed since.
        userSongIds: pickedEntries.map((entry) => entry.id),
      });
      react(
        milestone ? 'milestone' : nowLearned.length > 0 ? 'songLearned' : litStreak ? 'streakUp' : 'sessionSaved',
        { minutes, streak: after.count, milestone: milestone ?? undefined },
      );
      onSaved();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
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
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
              <PickChip
                label="Today"
                picked={!otherDay && day === todayValue}
                onPick={() => pickDay(todayValue)}
              />
              <PickChip
                label="Yesterday"
                picked={!otherDay && day === yesterdayValue}
                onPick={() => pickDay(yesterdayValue)}
              />
              <PickChip
                label={otherDay ? dayLabel(pastSessionTime(day, today).toISOString(), today) : 'Other day'}
                picked={otherDay}
                onPick={() => setOtherDay(true)}
              />
            </div>
            {otherDay ? (
              <TextField
                type="date"
                aria-label="Day of the session"
                value={day}
                max={todayValue}
                onChange={(event) => {
                  // Clearing the field keeps the day already chosen.
                  if (event.target.value) setDay(event.target.value);
                }}
              />
            ) : null}
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
              {PAST_MINUTES.map((value) => (
                <PickChip
                  key={value}
                  label={`${value} min`}
                  picked={!editingTime && seconds === value * 60}
                  onPick={() => {
                    setSeconds(value * 60);
                    setEditingTime(false);
                  }}
                />
              ))}
              <PickChip
                label={customLength && !editingTime ? formatSeconds(seconds) : 'Other length'}
                picked={editingTime || customLength}
                onPick={() => setEditingTime(true)}
              />
            </div>
            {editingTime ? (
              <DurationInput
                seconds={seconds}
                onCommit={(value) => {
                  setSeconds(value);
                  setEditingTime(false);
                }}
              />
            ) : null}
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
              <button
                type="button"
                aria-label={`${formatSeconds(seconds)}, tap to type a time`}
                onClick={() => setEditingTime(true)}
                className="h-11 min-w-32 text-center text-3xl font-bold text-text tabular-nums underline decoration-border decoration-dotted decoration-2 underline-offset-8"
              >
                {formatSeconds(seconds)}
              </button>
            )}
            <div className="flex gap-2">
              {ADJUST_MINUTES.map((minutes) => (
                <Chip
                  key={minutes}
                  label={`${minutes > 0 ? '+' : '−'}${Math.abs(minutes)} min`}
                  tone="neutral"
                  onClick={() => setSeconds((value) => adjustSeconds(value, minutes))}
                />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            {/* The count covers ticked songs that the folded or filtered list is hiding. */}
            Worked on{pickedCount > 0 ? ` (${pickedCount})` : ''}
          </h3>
          {entries.length === 0 ? (
            <p className="text-sm text-muted">Your songs show up here once you add some.</p>
          ) : (
            <>
              <button
                type="button"
                aria-expanded={choosing}
                onClick={() => setChoosing((open) => !open)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left active:opacity-80"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`line-clamp-2 ${pickedCount > 0 ? 'font-semibold text-text' : 'text-muted'}`}>
                    {pickedCount > 0 ? summarizeTitles(pickedTitles) : 'No songs picked'}
                  </span>
                  {nowLearned.length > 0 ? (
                    <span className="text-sm text-muted">{nowLearned.length} marked learned</span>
                  ) : null}
                </span>
                <ChevronDown
                  className={`size-5 shrink-0 text-muted transition-transform ${choosing ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {choosing ? (
                // The rows scroll in a box of their own, so Save stays in reach.
                <SongPicker
                  entries={entries}
                  sessions={sessions.data ?? []}
                  pinned={pinned}
                  scroll
                  renderRow={(entry) => (
                    <SongPick
                      key={entry.id}
                      entry={entry}
                      picked={picked.has(entry.id)}
                      onToggle={() => toggle(entry.id)}
                      // A song marked here keeps its toggle once its status has changed, so a retried save still shows it.
                      alreadyLearned={entry.status === 'learned' && !learned.has(entry.id)}
                      learned={learned.has(entry.id)}
                      onLearn={() => setLearned((current) => flip(current, entry.id))}
                    />
                  )}
                />
              ) : null}
            </>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">How did it go?</h3>
          <div className="flex gap-2">
            {feels.map((value) => (
              <span key={value} className="relative">
                <PickChip
                  label={feelLabels[value]}
                  picked={feel === value}
                  onPick={() => setFeel(feel === value ? null : value)}
                />
                {/* A great session gets a little burst of notes. */}
                {value === 'great' && feel === 'great' ? <NoteBurst /> : null}
              </span>
            ))}
          </div>
        </section>

        {failed ? (
          <p className="text-sm text-danger">Couldn't save. Check your connection and try again.</p>
        ) : null}

        <div className="flex flex-col gap-1">
          <Button label="Save" onClick={submit} loading={saving} />
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

type SongPickProps = {
  entry: LibraryEntry;
  picked: boolean;
  onToggle: () => void;
  // A song that was Learned before this recap: it shows the cap filled, with nothing to toggle.
  alreadyLearned: boolean;
  learned: boolean;
  onLearn: () => void;
};

const capClass = 'flex size-11 shrink-0 items-center justify-center rounded-full';

function SongPick({ entry, picked, onToggle, alreadyLearned, learned, onLearn }: SongPickProps) {
  return (
    <div
      className={`flex w-full items-center gap-2 rounded-2xl border pr-3 ${
        picked ? 'border-transparent bg-brand-soft text-on-brand-soft' : 'border-border bg-surface text-text'
      }`}
    >
      <button
        type="button"
        aria-pressed={picked}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 text-left active:opacity-80"
      >
        <CoverArt url={entry.song.cover_url} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{entry.song.title}</span>
          <span className={`truncate text-sm ${picked ? '' : 'text-muted'}`}>{entry.song.artist}</span>
        </span>
      </button>
      {alreadyLearned ? (
        <span role="img" aria-label="Already learned" className={`${capClass} bg-status-learned text-on-status-learned`}>
          <GraduationCap className="size-5" aria-hidden />
        </span>
      ) : picked ? (
        <button
          type="button"
          aria-label={`Mark ${entry.song.title} learned`}
          aria-pressed={learned}
          onClick={onLearn}
          className={`${capClass} transition active:scale-90 active:opacity-80 ${
            learned ? 'animate-tap bg-status-learned text-on-status-learned' : 'border border-border bg-surface text-muted'
          }`}
        >
          <GraduationCap className="size-5" aria-hidden />
        </button>
      ) : null}
      {picked ? <Check className="mr-1 size-5 shrink-0" aria-hidden /> : null}
    </div>
  );
}
