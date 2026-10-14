import { Flame, Guitar, Pause, Play, Plus, Timer, Waves } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { AccountButton } from '@/components/AccountButton';
import { SessionCard } from '@/components/SessionCard';
import { SessionRecap } from '@/components/SessionRecap';
import { SongRow } from '@/components/SongRow';
import { selectionForEntry, SongSheet, type SongSelection } from '@/components/SongSheet';
import { useElapsed } from '@/components/useElapsed';
import { Button, CoverArt, Screen } from '@/components/ui';
import { useActiveSession } from '@/lib/activeSession';
import type { LibraryEntry } from '@/lib/library';
import { formatMinutes, type ActiveSession } from '@/lib/practice';
import { useLibrary, useSessions } from '@/lib/queries';
import {
  daysPlayedThisWeek,
  jumpBackIn,
  relativeDay,
  songTotals,
  streakStatus,
  topSongsThisWeek,
  weekComparison,
  weekDays,
  type PracticeSession,
} from '@/lib/stats';

// Home is the practice screen: one Start button over this week's practice,
// which becomes a timer with a Stop button and the tools you reach for mid-session.
export function HomePage() {
  const { session, start } = useActiveSession();
  // Lives here so a song picked next to Start is already open when the timer appears.
  const [selection, setSelection] = useState<SongSelection | null>(null);

  const startWith = (entry?: LibraryEntry) => {
    start();
    setSelection(entry ? selectionForEntry(entry) : null);
  };

  return (
    <Screen title="Home" action={<AccountButton />}>
      {session ? (
        <RunningPanel session={session} selection={selection} onSelect={setSelection} />
      ) : (
        <StartPanel onStart={startWith} selection={selection} onSelect={setSelection} />
      )}
    </Screen>
  );
}

const RECENT_SESSIONS = 3;

type StartPanelProps = {
  onStart: (entry?: LibraryEntry) => void;
  selection: SongSelection | null;
  onSelect: (selection: SongSelection | null) => void;
};

function StartPanel({ onStart, selection, onSelect }: StartPanelProps) {
  const sessions = useSessions();
  const library = useLibrary();
  const [addingPast, setAddingPast] = useState(false);
  const now = new Date();
  const all = sessions.data ?? [];
  const suggestions = jumpBackIn(library.data ?? [], all);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 pt-6 pb-6">
      <button
        type="button"
        onClick={() => onStart()}
        className="flex size-48 flex-col items-center justify-center gap-2 rounded-full bg-button text-on-button shadow-lg transition-transform active:scale-95"
      >
        <Play className="size-12" aria-hidden />
        <span className="text-xl font-semibold">Start practice</span>
      </button>

      {suggestions.length > 0 ? <JumpBackIn entries={suggestions} sessions={all} now={now} onStart={onStart} /> : null}

      {sessions.isPending ? (
        <div aria-label="Loading your practice history" className="flex w-full flex-col gap-6">
          <div className="h-44 animate-pulse rounded-3xl bg-border" />
          <div className="h-20 animate-pulse rounded-2xl bg-border" />
          <div className="h-20 animate-pulse rounded-2xl bg-border" />
        </div>
      ) : (
        <>
          <WeekCard sessions={all} now={now} />
          <TopSongs entries={library.data ?? []} sessions={all} now={now} onSelect={onSelect} />
          <RecentSessions sessions={all} />
        </>
      )}

      <button
        type="button"
        onClick={() => setAddingPast(true)}
        className="min-h-11 text-sm text-muted underline underline-offset-2"
      >
        Forgot to start? Add a past session
      </button>

      {addingPast ? (
        <SessionRecap kind="past" onClose={() => setAddingPast(false)} onSaved={() => setAddingPast(false)} />
      ) : null}

      <SongSheet selection={selection} onSelect={onSelect} onClose={() => onSelect(null)} />
    </div>
  );
}

type JumpBackInProps = {
  entries: LibraryEntry[];
  sessions: PracticeSession[];
  now: Date;
  onStart: (entry: LibraryEntry) => void;
};

// Start practice with a song already open: the same action as the big button, one tap shorter.
function JumpBackIn({ entries, sessions, now, onStart }: JumpBackInProps) {
  const totals = songTotals(sessions);

  return (
    <section aria-label="Start with a song" className="flex w-full flex-col items-center gap-2">
      <h2 className="text-sm text-muted">or jump straight into</h2>
      <ul className="flex w-full justify-center gap-2">
        {entries.map((entry) => {
          const lastPlayed = totals.get(entry.id)?.lastPlayed;
          return (
            <li key={entry.id} className="min-w-0 basis-1/3">
              <button
                type="button"
                aria-label={`Start practice with ${entry.song.title}`}
                onClick={() => onStart(entry)}
                className="flex w-full flex-col items-center gap-1 rounded-2xl border border-border bg-surface p-3 active:opacity-80"
              >
                <CoverArt url={entry.song.cover_url} size="md" />
                <span className="w-full truncate text-center text-sm font-semibold text-text">
                  {entry.song.title}
                </span>
                <span className="w-full truncate text-center text-xs text-muted">
                  {lastPlayed ? relativeDay(lastPlayed, now) : 'not played yet'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// "25 min more than this point last week", or null when there is nothing to compare.
function comparisonLine(thisWeek: number, lastWeekSoFar: number): string | null {
  if (thisWeek === 0 && lastWeekSoFar === 0) return null;
  const difference = thisWeek - lastWeekSoFar;
  if (difference === 0) return 'Same as this point last week';
  return `${formatMinutes(Math.abs(difference))} ${difference > 0 ? 'more' : 'less'} than this point last week`;
}

// This week at a glance: the streak, the time played against last week, and a bar per day.
function WeekCard({ sessions, now }: { sessions: PracticeSession[]; now: Date }) {
  const { count, playedToday } = streakStatus(sessions, now);
  const lit = count > 0;
  const nudge = playedToday
    ? 'Done for today'
    : lit
      ? `Play today to keep your ${count}-day streak`
      : 'Start a streak today';
  const { thisWeek, lastWeekSoFar } = weekComparison(sessions, now);
  const comparison = comparisonLine(thisWeek, lastWeekSoFar);
  const days = weekDays(sessions, now);
  const longest = Math.max(...days.map((day) => day.minutes));

  return (
    <section
      aria-label="Streak and this week"
      className="flex w-full flex-col gap-5 rounded-3xl border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-4">
        <div
          aria-label={`${count} ${count === 1 ? 'day' : 'days'} in a row`}
          className={`flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl ${
            lit ? 'bg-streak-soft text-on-streak-soft' : 'border border-border text-muted'
          }`}
        >
          <Flame className={`size-7 ${lit ? 'fill-streak text-streak' : ''}`} aria-hidden />
          <span className="text-lg leading-none font-bold tabular-nums">{count}</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="font-semibold text-text">{nudge}</p>
          <p className="text-sm text-muted">{daysPlayedThisWeek(sessions, now)} of 7 days this week</p>
        </div>
      </div>

      <div className="flex flex-col">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">This week</p>
        <p className="text-3xl font-bold text-text tabular-nums">{formatMinutes(thisWeek)}</p>
        {comparison ? <p className="text-sm text-muted">{comparison}</p> : null}
      </div>

      <ul className="flex gap-2">
        {days.map((day) => (
          <li key={day.date.toISOString()} className="flex flex-1 flex-col items-center gap-2">
            <span
              role="img"
              aria-label={`${day.date.toLocaleDateString(undefined, { weekday: 'long' })}: ${
                day.minutes > 0 ? formatMinutes(day.minutes) : day.isFuture ? 'still to come' : 'no practice'
              }`}
              className="flex h-24 w-full items-end"
            >
              <span
                // The tallest day fills the chart; a day without practice keeps a stub.
                style={day.minutes > 0 ? { height: `${Math.max((day.minutes / longest) * 100, 8)}%` } : undefined}
                className={`w-full rounded-lg ${
                  day.minutes > 0
                    ? 'bg-brand'
                    : day.isFuture
                      ? 'h-2 border border-dashed border-border'
                      : 'h-2 bg-border'
                }`}
              />
            </span>
            <span className={`text-xs ${day.isToday ? 'font-semibold text-text' : 'text-muted'}`} aria-hidden>
              {day.date.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type TopSongsProps = {
  entries: LibraryEntry[];
  sessions: PracticeSession[];
  now: Date;
  onSelect: (selection: SongSelection) => void;
};

// The songs that got the most time this week. Hidden until a session has logged one.
function TopSongs({ entries, sessions, now, onSelect }: TopSongsProps) {
  const top = topSongsThisWeek(sessions, now).flatMap(({ userSongId, minutes }) => {
    // A song removed from the library since has nothing to show.
    const entry = entries.find((candidate) => candidate.id === userSongId);
    return entry ? [{ entry, minutes }] : [];
  });
  if (top.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Top songs this week</h2>
      {top.map(({ entry, minutes }) => (
        <SongRow
          key={entry.id}
          title={entry.song.title}
          artist={entry.song.artist}
          coverUrl={entry.song.cover_url}
          detail={formatMinutes(Math.max(1, Math.round(minutes)))}
          onClick={() => onSelect(selectionForEntry(entry))}
        />
      ))}
    </section>
  );
}

// The latest few sessions; the My Log tab has all of them, with details.
function RecentSessions({ sessions }: { sessions: PracticeSession[] }) {
  return (
    <section className="flex w-full flex-col gap-2">
      <div className="flex min-h-11 items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Recent sessions</h2>
        {sessions.length > 0 ? (
          <Link to="/log" className="flex min-h-11 items-center text-sm font-medium text-on-brand-soft">
            Show all
          </Link>
        ) : null}
      </div>
      {sessions.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-center text-sm text-muted">
          Your sessions show up here after your first practice.
        </p>
      ) : (
        sessions
          .slice(0, RECENT_SESSIONS)
          .map((session) => <SessionCard key={session.id} session={session} to={`/log?session=${session.id}`} />)
      )}
    </section>
  );
}

type RunningPanelProps = {
  session: ActiveSession;
  selection: SongSelection | null;
  onSelect: (selection: SongSelection | null) => void;
};

function RunningPanel({ session, selection, onSelect: setSelection }: RunningPanelProps) {
  const { discard, pause, resume } = useActiveSession();
  const clock = useElapsed(session);
  const paused = Boolean(session.pausedAt);
  const library = useLibrary();
  const [finishing, setFinishing] = useState(false);
  // Stop pauses the clock; backing out of the recap starts it again, unless it was already paused.
  const [resumeOnClose, setResumeOnClose] = useState(false);

  const entries = library.data ?? [];
  const learning = entries.filter((entry) => entry.status === 'learning');
  const others = entries.filter((entry) => entry.status !== 'learning' && entry.status !== 'shelved');

  // Opening the sheet is what marks a song as practiced (see SongSheet).
  const songRow = (entry: LibraryEntry) => (
    <SongRow
      key={entry.id}
      title={entry.song.title}
      artist={entry.song.artist}
      coverUrl={entry.song.cover_url}
      status={entry.status}
      onClick={() => setSelection(selectionForEntry(entry))}
    />
  );

  return (
    <div className="flex flex-col gap-6 pb-6">
      <section className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-muted">
          {paused ? (
            <Pause className="size-4 text-brand" aria-hidden />
          ) : (
            <Timer className="size-4 text-brand" aria-hidden />
          )}
          {paused ? 'Paused' : 'Practicing'}
        </p>
        <p role="timer" className={`text-5xl font-bold tabular-nums ${paused ? 'text-muted' : 'text-text'}`}>
          {clock}
        </p>
        <div className="flex w-full gap-2">
          <Button label={paused ? 'Resume' : 'Pause'} variant="secondary" onClick={paused ? resume : pause} />
          <Button
            label="Stop"
            onClick={() => {
              setResumeOnClose(!paused);
              pause();
              setFinishing(true);
            }}
          />
        </div>
      </section>

      <section aria-label="Tools" className="grid grid-cols-3 gap-2">
        <Link
          to="/add"
          className="flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-surface text-sm font-medium text-text active:opacity-80"
        >
          <Plus className="size-6 text-brand" aria-hidden />
          Add songs
        </Link>
        <ComingSoon icon={<Waves className="size-6" aria-hidden />} label="Metronome" />
        <ComingSoon icon={<Guitar className="size-6" aria-hidden />} label="Tuner" />
      </section>

      {library.isPending ? (
        <p className="text-center text-muted">Loading your songs…</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-muted">Add a song to open its tabs and notes while you play.</p>
      ) : (
        <>
          {learning.length > 0 ? <SongSection title="Learning">{learning.map(songRow)}</SongSection> : null}
          {others.length > 0 ? (
            <SongSection title={learning.length > 0 ? 'More songs' : 'Your songs'}>{others.map(songRow)}</SongSection>
          ) : null}
        </>
      )}

      <SongSheet selection={selection} onSelect={setSelection} onClose={() => setSelection(null)} />

      {finishing ? (
        <SessionRecap
          kind="finish"
          session={session}
          onClose={() => {
            setFinishing(false);
            if (resumeOnClose) resume();
          }}
          onSaved={discard}
          onDiscard={discard}
        />
      ) : null}
    </div>
  );
}

function SongSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

// A reserved slot for a tool that ships in a later build.
function ComingSoon({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      aria-disabled
      className="flex h-20 flex-col items-center justify-center gap-0.5 rounded-2xl border border-border bg-surface text-sm font-medium text-muted opacity-60"
    >
      {icon}
      {label}
      <span className="text-xs font-normal">Soon</span>
    </div>
  );
}
