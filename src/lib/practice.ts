import type { PracticeFeel, SongStatus } from './database.types';
import type { LibraryEntry } from './library';

// The session in progress. It lives on the device until the recap is saved, so
// the timer is just these timestamps (ISO strings) and survives a force-quit.
export type ActiveSession = {
  startedAt: string;
  lastSeenAt: string;
  // Library entry ids in the order they were opened.
  touched: string[];
  // Set while the timer is paused. Sessions stored before pausing existed have neither field.
  pausedAt?: string | null;
  // Time spent in pauses that have already ended.
  pausedMs?: number;
};

export const feelLabels: Record<PracticeFeel, string> = { rough: 'Rough', okay: 'Okay', great: 'Great' };

// What the mascot does while a session runs. Picked from the start time, so it
// stays the same through relaunches and changes from one session to the next.
export const practiceActivities = ['guitar', 'lifting', 'singing'] as const;
export type PracticeActivity = (typeof practiceActivities)[number];

export function practiceActivity(session: Pick<ActiveSession, 'startedAt'>): PracticeActivity {
  const seconds = Math.floor(Date.parse(session.startedAt) / 1000);
  if (!Number.isFinite(seconds)) return 'guitar';
  return practiceActivities[seconds % practiceActivities.length];
}

export const MAX_SECONDS = 86_400; // matches the duration_sec check on practice_sessions
const ABANDONED_AFTER_MS = 3 * 60 * 60 * 1000;

// `touched` pre-ticks songs, e.g. when practice starts from a song or a jamlist.
export function startSession(now: Date, touched: readonly string[] = []): ActiveSession {
  const iso = now.toISOString();
  return { startedAt: iso, lastSeenAt: iso, touched: [...new Set(touched)] };
}

export function touchSong(session: ActiveSession, entryId: string, now: Date): ActiveSession {
  return {
    ...session,
    lastSeenAt: now.toISOString(),
    touched: session.touched.includes(entryId) ? session.touched : [...session.touched, entryId],
  };
}

export function markSeen(session: ActiveSession, now: Date): ActiveSession {
  return { ...session, lastSeenAt: now.toISOString() };
}

export function pauseSession(session: ActiveSession, now: Date): ActiveSession {
  if (session.pausedAt) return session;
  const iso = now.toISOString();
  return { ...session, lastSeenAt: iso, pausedAt: iso };
}

export function resumeSession(session: ActiveSession, now: Date): ActiveSession {
  if (!session.pausedAt) return session;
  const paused = Math.max(0, now.getTime() - new Date(session.pausedAt).getTime());
  return {
    ...session,
    lastSeenAt: now.toISOString(),
    pausedAt: null,
    pausedMs: (session.pausedMs ?? 0) + paused,
  };
}

// Time actually played up to `now`: the clock stops at pausedAt, and finished pauses don't count.
export function playedMs(session: ActiveSession, now: Date): number {
  const end = session.pausedAt ? Math.min(now.getTime(), new Date(session.pausedAt).getTime()) : now.getTime();
  return Math.max(0, end - new Date(session.startedAt).getTime() - (session.pausedMs ?? 0));
}

// Whole seconds played, kept inside what a saved session allows.
export function elapsedSeconds(session: ActiveSession, now: Date): number {
  const seconds = Math.floor(playedMs(session, now) / 1000);
  return Math.min(MAX_SECONDS, Math.max(1, seconds));
}

// Nudges a duration by whole minutes, for the recap's "+5 min" style buttons.
// A step that would leave nothing is ignored rather than clamped.
export function adjustSeconds(seconds: number, deltaMinutes: number): number {
  const next = seconds + deltaMinutes * 60;
  return next < 1 ? seconds : Math.min(MAX_SECONDS, next);
}

// A locked phone during a long session is normal, so this is deliberately long.
// Anything shorter is fixed with the recap's editable duration.
export function isProbablyAbandoned(session: ActiveSession, now: Date): boolean {
  return now.getTime() - new Date(session.lastSeenAt).getTime() > ABANDONED_AFTER_MS;
}

// The entries the recap pre-ticks: the ones opened that still exist.
export function suggestedSongs(session: ActiveSession, library: LibraryEntry[]): LibraryEntry[] {
  return session.touched.flatMap((id) => library.find((entry) => entry.id === id) ?? []);
}

// Learning songs are the likeliest to have been played, shelved ones the least.
const recapStatusOrder: SongStatus[] = ['learning', 'want_to_learn', 'learned', 'shelved'];

// The recap's song list: the ones opened this session first (in the order
// opened), then the rest by status.
export function recapOrder(library: LibraryEntry[], touched: string[]): LibraryEntry[] {
  const rank = (entry: LibraryEntry) => {
    const opened = touched.indexOf(entry.id);
    return opened >= 0 ? opened : touched.length + recapStatusOrder.indexOf(entry.status);
  };
  return [...library].sort((a, b) => rank(a) - rank(b));
}

// A local calendar day as 'YYYY-MM-DD', the value a date input uses.
export function dateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// When a session logged after the fact is taken to have happened: now for
// today, otherwise noon on that local day ('YYYY-MM-DD'). Never in the future.
export function pastSessionTime(day: string, now: Date): Date {
  if (day === dateInputValue(now)) return now;
  const [year, month, date] = day.split('-').map(Number);
  const noon = new Date(year, month - 1, date, 12);
  return Number.isNaN(noon.getTime()) || noon > now ? now : noon;
}

// "Wonderwall, Blackbird and 4 more": a long list of titles in one line.
export function summarizeTitles(titles: string[], shown = 2): string {
  const rest = titles.length - shown;
  const listed = titles.slice(0, shown).join(', ');
  return rest > 0 ? `${listed} and ${rest} more` : listed;
}

// Timer text: 12:34, or 1:02:03 past an hour.
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

// "34 min", "1 h 20 m".
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} m`;
}

// One session's length, written like the timer: "0:45", "12:34", "1:20:05".
export function formatSeconds(totalSeconds: number): string {
  return formatClock(totalSeconds * 1000);
}
