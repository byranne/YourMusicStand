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

export const MAX_SECONDS = 86_400; // matches the duration_sec check on practice_sessions
const ABANDONED_AFTER_MS = 3 * 60 * 60 * 1000;

export function startSession(now: Date): ActiveSession {
  const iso = now.toISOString();
  return { startedAt: iso, lastSeenAt: iso, touched: [] };
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
