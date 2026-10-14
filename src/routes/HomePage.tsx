import { Guitar, Pause, Play, Plus, Waves } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';

import { AccountButton } from '@/components/AccountButton';
import { Equalizer } from '@/components/Equalizer';
import { Mascot } from '@/components/Mascot';
import { SessionCard } from '@/components/SessionCard';
import { SessionRecap } from '@/components/SessionRecap';
import { SMALL_LIBRARY, SongPicker } from '@/components/SongPicker';
import { SongRow } from '@/components/SongRow';
import { StreakFlame } from '@/components/StreakFlame';
import { selectionForEntry, SongSheet, type SongSelection } from '@/components/SongSheet';
import { useCountUp } from '@/components/useCountUp';
import { useElapsed } from '@/components/useElapsed';
import { useTypewriter } from '@/components/useTypewriter';
import { Button, Chip, CoverArt, LoadError, Screen, Skeleton, stagger } from '@/components/ui';
import { useActiveSession } from '@/lib/activeSession';
import { pickGreeting, type Greeting } from '@/lib/greeting';
import { statusLabels, type LibraryEntry } from '@/lib/library';
import { formatMinutes, type ActiveSession } from '@/lib/practice';
import { useLibrary, useSessions } from '@/lib/queries';
import {
  brushUps,
  daysSinceLastSession,
  jumpBackIn,
  lastPlayedSong,
  minutesToday,
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
  const failed = sessions.isError || library.isError;
  // A new account: nothing in the library and nothing practised.
  const isNew = all.length === 0 && library.data?.length === 0;
  // With no sessions yet, the library decides between the welcome and the week, so wait for it too.
  const loading = sessions.isPending || (all.length === 0 && library.isPending);
  const suggestions = jumpBackIn(library.data ?? [], all);
  const week = weekComparison(all, now);
  const topId = topSongsThisWeek(all, now, 1)[0]?.userSongId;
  const topEntry = (library.data ?? []).find((entry) => entry.id === topId);
  // Fixed for this visit to Home, so the line doesn't change as data refreshes.
  // Tapping the mascot moves it on to the next line.
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));
  const lastSong = lastPlayedSong(library.data ?? [], all, now);
  // Waits for the library too: its song names decide which lines are on offer.
  const greeting =
    sessions.isPending || library.isPending
      ? null
      : pickGreeting(
          {
            hour: now.getHours(),
            streak: streakStatus(all, now),
            daysSinceLast: daysSinceLastSession(all, now),
            sessionCount: all.length,
            songTitle: suggestions[0]?.song.title ?? null,
            lastSong: lastSong ? { title: lastSong.entry.song.title, daysAgo: lastSong.daysAgo } : null,
            topSongTitle: topEntry?.song.title ?? null,
            todayMinutes: minutesToday(all, now),
            weekMinutes: week.thisWeek,
            lastWeekSoFar: week.lastWeekSoFar,
          },
          seed,
        );

  return (
    <div className="flex flex-1 flex-col items-center gap-6 pt-2 pb-6">
      <div className="relative flex size-48 items-center justify-center">
        {/* A soft halo breathing behind the button, inviting a tap. */}
        <span aria-hidden className="absolute -inset-3 animate-breathe rounded-full bg-brand/25" />
        <button
          type="button"
          onClick={() => onStart()}
          className="relative flex size-48 flex-col items-center justify-center gap-2 rounded-full bg-button text-on-button shadow-lg transition-transform active:scale-95"
        >
          <Play className="size-12 animate-nudge fill-on-button" aria-hidden />
          <span className="text-xl font-semibold">Start practice</span>
        </button>
      </div>

      {suggestions.length > 0 ? <JumpBackIn entries={suggestions} sessions={all} now={now} onStart={onStart} /> : null}

      {failed ? (
        <LoadError
          message="Couldn't load your practice history."
          onRetry={() => {
            void sessions.refetch();
            void library.refetch();
          }}
          retrying={sessions.isFetching || library.isFetching}
        />
      ) : loading ? (
        <div aria-label="Loading your practice history" className="flex w-full flex-col gap-6">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : isNew ? (
        <Welcome />
      ) : (
        <>
          <WeekCard sessions={all} now={now} greeting={greeting} onPoke={() => setSeed((current) => current + 1)} />
          <TopSongs entries={library.data ?? []} sessions={all} now={now} onSelect={onSelect} />
          <BrushUp entries={library.data ?? []} sessions={all} now={now} onSelect={onSelect} />
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

// What a new account sees in place of stats it doesn't have yet: where to begin.
function Welcome() {
  const navigate = useNavigate();

  return (
    <section className="flex w-full animate-rise flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-6 text-center">
      {/* Hops once to say hello. */}
      <Mascot mood="celebrate" size={72} />
      <h2 className="text-xl font-bold text-text">Welcome to MusicStand</h2>
      <p className="text-muted">
        Add the songs you're learning, then tap Start practice whenever you play. Your streak and stats build
        up from there.
      </p>
      <Button label="Add your first song" onClick={() => navigate('/add')} />
    </section>
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
      <h2 className="text-sm text-muted">Pick up where you left off</h2>
      <ul className="flex w-full justify-center gap-2">
        {entries.map((entry, index) => {
          const lastPlayed = totals.get(entry.id)?.lastPlayed;
          return (
            <li key={entry.id} style={stagger(index)} className="min-w-0 basis-1/3 animate-rise">
              <button
                type="button"
                aria-label={`Start practice with ${entry.song.title}`}
                onClick={() => onStart(entry)}
                className="flex w-full flex-col items-center gap-1 rounded-2xl border border-border bg-surface p-3 transition-transform active:scale-95 active:opacity-80"
              >
                <CoverArt url={entry.song.cover_url} size="md" />
                <span className="w-full truncate text-center text-sm font-semibold text-text">
                  {entry.song.title}
                </span>
                <Chip label={statusLabels[entry.status]} tone={entry.status} />
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

// The mascot saying the greeting, typed out like dialogue. Tap him for another line.
function MascotLine({ greeting, onPoke }: { greeting: Greeting; onPoke: () => void }) {
  const shown = useTypewriter(greeting.text);
  const [pokes, setPokes] = useState(0);
  const talking = shown < greeting.text.length;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <button
        type="button"
        aria-label="Say something else"
        onClick={() => {
          setPokes((count) => count + 1);
          onPoke();
        }}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl"
      >
        {/* Keyed by the tap count, so every tap replays the hop. */}
        <span key={pokes} className={`block ${pokes > 0 ? 'animate-hop' : ''}`}>
          <Mascot mood={greeting.mood} size={40} decorative talking={talking} />
        </span>
      </button>
      <p aria-live="polite" className="min-w-0 font-semibold text-text">
        <span className="sr-only">{greeting.text}</span>
        {/* The untyped rest is laid out but invisible, so the card doesn't grow as the line types. */}
        <span aria-hidden>
          {greeting.text.slice(0, shown)}
          <span className="invisible">{greeting.text.slice(shown)}</span>
        </span>
      </p>
    </div>
  );
}

// This week at a glance: the streak, the time played against last week, and a bar per day.
type WeekCardProps = { sessions: PracticeSession[]; now: Date; greeting: Greeting | null; onPoke: () => void };

function WeekCard({ sessions, now, greeting, onPoke }: WeekCardProps) {
  const { count } = streakStatus(sessions, now);
  const lit = count > 0;
  const { thisWeek, lastWeekSoFar } = weekComparison(sessions, now);
  const comparison = comparisonLine(thisWeek, lastWeekSoFar);
  const shownMinutes = useCountUp(thisWeek);
  const days = weekDays(sessions, now);
  const longest = Math.max(...days.map((day) => day.minutes));

  return (
    <section
      aria-label="Streak and this week"
      className="flex w-full animate-rise flex-col gap-5 rounded-3xl border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-4">
        <div
          aria-label={`${count} ${count === 1 ? 'day' : 'days'} in a row`}
          className={`flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl ${
            lit ? 'bg-streak-soft text-on-streak-soft' : 'border border-border text-muted'
          }`}
        >
          <StreakFlame count={count} />
          {/* Keyed by the count, so a new day on the streak pops in. */}
          <span key={count} className="animate-pop text-lg leading-none font-bold tabular-nums">
            {count}
          </span>
        </div>
        {greeting ? <MascotLine greeting={greeting} onPoke={onPoke} /> : null}
      </div>

      <div className="flex flex-col">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">This week</p>
        <p className="text-3xl font-bold text-text tabular-nums">
          <span className="sr-only">{formatMinutes(thisWeek)}</span>
          <span aria-hidden>{formatMinutes(shownMinutes)}</span>
        </p>
        {comparison ? <p className="text-sm text-muted">{comparison}</p> : null}
      </div>

      <ul className="flex gap-2">
        {days.map((day, index) => (
          <li key={day.date.toISOString()} className="flex flex-1 flex-col items-center gap-2">
            <span
              role="img"
              aria-label={`${day.date.toLocaleDateString(undefined, { weekday: 'long' })}: ${
                day.minutes > 0 ? formatMinutes(day.minutes) : day.isFuture ? 'still to come' : 'no practice'
              }`}
              className="flex h-24 w-full items-end"
            >
              <span
                // The tallest day fills the chart; a day without practice keeps a stub. Bars grow in day by day.
                style={{
                  ...stagger(index),
                  ...(day.minutes > 0 ? { height: `${Math.max((day.minutes / longest) * 100, 8)}%` } : {}),
                }}
                className={`relative w-full origin-bottom animate-grow-up overflow-hidden rounded-lg ${
                  day.minutes > 0
                    ? 'bg-brand'
                    : day.isFuture
                      ? 'h-2 border border-dashed border-border'
                      : 'h-2 bg-border'
                }`}
              >
                {/* Today's bar has a light running up it while the day is still going. */}
                {day.isToday && day.minutes > 0 ? (
                  <span className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-surface/40 to-transparent" />
                ) : null}
              </span>
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
      {top.map(({ entry, minutes }, index) => (
        <SongRow
          key={entry.id}
          index={index}
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

// Learned songs that haven't been played for a while. Hidden when none are due.
function BrushUp({ entries, sessions, now, onSelect }: TopSongsProps) {
  const due = brushUps(entries, sessions, now);
  if (due.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Due for a brush-up</h2>
      {due.map(({ entry, since }, index) => (
        <SongRow
          key={entry.id}
          index={index}
          title={entry.song.title}
          artist={entry.song.artist}
          coverUrl={entry.song.cover_url}
          detail={relativeDay(since, now)}
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
          .map((session, index) => (
            <SessionCard key={session.id} index={index} session={session} to={`/log?session=${session.id}`} />
          ))
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

  const sessions = useSessions();
  const entries = library.data ?? [];
  const learning = entries.filter((entry) => entry.status === 'learning');
  const others = entries.filter((entry) => entry.status !== 'learning' && entry.status !== 'shelved');
  // Small libraries are listed whole, in sections; big ones go through the picker.
  const small = entries.length <= SMALL_LIBRARY;

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
      <section className="flex animate-rise flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-muted">
          {paused ? (
            <Pause className="size-4 text-brand" aria-hidden />
          ) : (
            // A live dot, pulsing like a recording light.
            <span aria-hidden className="relative flex size-4 items-center justify-center">
              <span className="absolute size-2.5 animate-live rounded-full bg-brand" />
              <span className="relative size-2.5 rounded-full bg-brand" />
            </span>
          )}
          {paused ? 'Paused' : 'Practicing'}
        </p>
        <p role="timer" className={`text-5xl font-bold tabular-nums ${paused ? 'text-muted' : 'text-text'}`}>
          {clock}
        </p>
        <Equalizer paused={paused} className="h-6 gap-1 text-brand" />
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
          className="flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-surface text-sm font-medium text-text transition-transform active:scale-95 active:opacity-80"
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
          {small ? (
            <>
              {learning.length > 0 ? <SongSection title="Learning">{learning.map(songRow)}</SongSection> : null}
              {others.length > 0 ? (
                <SongSection title={learning.length > 0 ? 'More songs' : 'Your songs'}>
                  {others.map(songRow)}
                </SongSection>
              ) : null}
            </>
          ) : (
            <SongSection title="Your songs">
              <SongPicker
                entries={entries}
                sessions={sessions.data ?? []}
                pinned={session.touched}
                renderRow={songRow}
              />
            </SongSection>
          )}
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
