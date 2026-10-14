import type { SongStatus, Tables } from './database.types';

export type PracticeSession = Tables<'practice_sessions'> & { songs: { user_song_id: string }[] };

type SessionTime = Pick<PracticeSession, 'practiced_at' | 'duration_min'>;

// Days are the user's local days, not UTC.
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function daysAgo(now: Date, count: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - count);
}

export type WeekDay = { date: Date; minutes: number; isToday: boolean; isFuture: boolean };

// Days since this week's Monday: 0 on a Monday, 6 on a Sunday.
const daysSinceMonday = (now: Date) => (now.getDay() + 6) % 7;

// Monday to Sunday of a local week, with the minutes played on each: the current
// week, or the one `weeksAgo` before it (where no day is today or still to come).
export function weekDays(sessions: SessionTime[], now: Date, weeksAgo = 0): WeekDay[] {
  const minutesByDay = new Map<string, number>();
  for (const session of sessions) {
    const key = dayKey(new Date(session.practiced_at));
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + session.duration_min);
  }
  const today = daysSinceMonday(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = daysAgo(now, today - index + weeksAgo * 7);
    return {
      date,
      minutes: minutesByDay.get(dayKey(date)) ?? 0,
      isToday: weeksAgo === 0 && index === today,
      isFuture: weeksAgo === 0 && index > today,
    };
  });
}

export function minutesThisWeek(sessions: SessionTime[], now: Date): number {
  return weekDays(sessions, now).reduce((total, day) => total + day.minutes, 0);
}

// This week against last week up to the same weekday, so a Monday isn't
// compared with a whole week.
export function weekComparison(sessions: SessionTime[], now: Date): { thisWeek: number; lastWeekSoFar: number } {
  const lastWeekSoFar = weekDays(sessions, now, 1)
    .slice(0, daysSinceMonday(now) + 1)
    .reduce((total, day) => total + day.minutes, 0);
  return { thisWeek: minutesThisWeek(sessions, now), lastWeekSoFar };
}

export type GoalProgress = { ratio: number; remaining: number; met: boolean };

// How far this week's minutes are toward a weekly goal. ratio is capped at 1.
export function goalProgress(weekMinutes: number, goalMinutes: number): GoalProgress {
  const goal = Math.max(1, goalMinutes);
  return {
    ratio: Math.min(1, weekMinutes / goal),
    remaining: Math.max(0, goal - weekMinutes),
    met: weekMinutes >= goal,
  };
}

export function daysPlayedThisWeek(sessions: SessionTime[], now: Date): number {
  return weekDays(sessions, now).filter((day) => day.minutes > 0).length;
}

export function totalMinutes(sessions: SessionTime[]): number {
  return sessions.reduce((total, session) => total + session.duration_min, 0);
}

// Consecutive days played, counting back from today. Not having played yet today
// doesn't break a streak that is still alive from yesterday.
export function currentStreak(sessions: SessionTime[], now: Date): number {
  const played = new Set(sessions.map((session) => dayKey(new Date(session.practiced_at))));
  let offset = played.has(dayKey(now)) ? 0 : 1;
  let streak = 0;
  while (played.has(dayKey(daysAgo(now, offset)))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

// The streak plus whether today already counts, for the "play today to keep it" nudge.
export function streakStatus(sessions: SessionTime[], now: Date): { count: number; playedToday: boolean } {
  const today = dayKey(now);
  return {
    count: currentStreak(sessions, now),
    playedToday: sessions.some((session) => dayKey(new Date(session.practiced_at)) === today),
  };
}

// The longest run of consecutive days ever played.
export function bestStreak(sessions: SessionTime[]): number {
  const days = [
    ...new Set(
      sessions.map((session) => {
        const date = new Date(session.practiced_at);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      }),
    ),
  ].sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  days.forEach((day, index) => {
    // Rounded, because a daylight-saving change makes a day 23 or 25 hours long.
    const consecutive = index > 0 && Math.round((day - days[index - 1]) / 86_400_000) === 1;
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export type SongTotals = { sessions: number; minutes: number; lastPlayed: string };

// Per library entry. A session's minutes are split evenly across its songs, so
// a 30-minute sitting on two songs counts 15 for each.
export function songTotals(sessions: PracticeSession[]): Map<string, SongTotals> {
  const totals = new Map<string, SongTotals>();
  for (const session of sessions) {
    if (session.songs.length === 0) continue;
    const share = session.duration_min / session.songs.length;
    for (const { user_song_id } of session.songs) {
      const current = totals.get(user_song_id);
      totals.set(user_song_id, {
        sessions: (current?.sessions ?? 0) + 1,
        minutes: (current?.minutes ?? 0) + share,
        lastPlayed:
          current && current.lastPlayed > session.practiced_at ? current.lastPlayed : session.practiced_at,
      });
    }
  }
  return totals;
}

// The library entries with the most time this week, most first. Minutes are
// split across a session's songs, as in songTotals.
export function topSongsThisWeek(
  sessions: PracticeSession[],
  now: Date,
  limit = 3,
): { userSongId: string; minutes: number }[] {
  const monday = daysAgo(now, daysSinceMonday(now)).getTime();
  const nextMonday = daysAgo(now, daysSinceMonday(now) - 7).getTime();
  const thisWeek = sessions.filter((session) => {
    const time = new Date(session.practiced_at).getTime();
    return time >= monday && time < nextMonday;
  });
  // Songs from one session share its minutes, so ties fall to the song played
  // in more sessions, then the one played last.
  return [...songTotals(thisWeek)]
    .sort(
      ([, a], [, b]) =>
        b.minutes - a.minutes || b.sessions - a.sessions || b.lastPlayed.localeCompare(a.lastPlayed),
    )
    .map(([userSongId, totals]) => ({ userSongId, minutes: totals.minutes }))
    .slice(0, limit);
}

// Whole local calendar days from a time to now. Rounded, because a
// daylight-saving change makes a day 23 or 25 hours long.
function localDaysAgo(iso: string, now: Date): number {
  const then = new Date(iso);
  return Math.round(
    (daysAgo(now, 0).getTime() - new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) /
      86_400_000,
  );
}

// "today", "yesterday", "3 days ago", for a local calendar day.
export function relativeDay(iso: string, now: Date): string {
  const days = localDaysAgo(iso, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

// Whole local days since the most recent session; null when there is none.
export function daysSinceLastSession(sessions: SessionTime[], now: Date): number | null {
  if (sessions.length === 0) return null;
  const latest = sessions.reduce((max, session) => (session.practiced_at > max ? session.practiced_at : max), '');
  return Math.max(0, localDaysAgo(latest, now));
}

// The songs to offer next to Start: the ones played most recently, whatever
// their status, topped up with Learning songs never played. Shelved songs are
// left out. Songs from one session share its time, so among those Learning
// ones come first, then the ones with the most practice.
export function jumpBackIn<Entry extends { id: string; status: SongStatus }>(
  entries: Entry[],
  sessions: PracticeSession[],
  limit = 3,
): Entry[] {
  const totals = songTotals(sessions);
  const lastPlayed = (entry: Entry) => new Date(totals.get(entry.id)?.lastPlayed ?? 0).getTime();
  const statusRank = (entry: Entry) => (entry.status === 'learning' ? 0 : 1);
  const minutes = (entry: Entry) => totals.get(entry.id)?.minutes ?? 0;
  const count = (entry: Entry) => totals.get(entry.id)?.sessions ?? 0;
  return entries
    .filter((entry) => entry.status !== 'shelved' && (totals.has(entry.id) || entry.status === 'learning'))
    .sort(
      (a, b) =>
        lastPlayed(b) - lastPlayed(a) ||
        statusRank(a) - statusRank(b) ||
        minutes(b) - minutes(a) ||
        count(b) - count(a),
    )
    .slice(0, limit);
}

const BRUSH_UP_AFTER_DAYS = 30;

// Learned songs that are going stale: not played (or, if never played, not
// marked Learned) for a while, the longest-neglected first. `since` is the
// time they were last touched.
export function brushUps<Entry extends { id: string; status: SongStatus; learned_at: string | null }>(
  entries: Entry[],
  sessions: PracticeSession[],
  now: Date,
  limit = 2,
  staleDays = BRUSH_UP_AFTER_DAYS,
): { entry: Entry; since: string }[] {
  const totals = songTotals(sessions);
  const time = (iso: string) => new Date(iso).getTime();
  return entries
    .flatMap((entry) => {
      if (entry.status !== 'learned') return [];
      const touched = [totals.get(entry.id)?.lastPlayed, entry.learned_at].filter((iso) => iso != null);
      if (touched.length === 0) return [];
      const since = touched.reduce((latest, iso) => (time(iso) > time(latest) ? iso : latest));
      return localDaysAgo(since, now) >= staleDays ? [{ entry, since }] : [];
    })
    .sort((a, b) => time(a.since) - time(b.since))
    .slice(0, limit);
}

// The songs to offer when the library is too long to list: played ones first,
// most recent first, then Learning ones never played. Shelved songs are left out.
export function recentSongs<Entry extends { id: string; status: SongStatus }>(
  entries: Entry[],
  sessions: PracticeSession[],
  limit = 5,
): Entry[] {
  const totals = songTotals(sessions);
  const lastPlayed = (entry: Entry) => new Date(totals.get(entry.id)?.lastPlayed ?? 0).getTime();
  const unplayedRank = (entry: Entry) => (entry.status === 'learning' ? 0 : 1);
  return entries
    .filter((entry) => entry.status !== 'shelved')
    .sort((a, b) => lastPlayed(b) - lastPlayed(a) || unplayedRank(a) - unplayedRank(b))
    .slice(0, limit);
}

// The song most recently practiced and how many local days ago, or null when
// none has been. Not always the latest session: a session can have no songs.
export function lastPlayedSong<Entry extends { id: string }>(
  entries: Entry[],
  sessions: PracticeSession[],
  now: Date,
): { entry: Entry; daysAgo: number } | null {
  const totals = songTotals(sessions);
  let best: { entry: Entry; lastPlayed: string } | null = null;
  for (const entry of entries) {
    const lastPlayed = totals.get(entry.id)?.lastPlayed;
    if (lastPlayed && (!best || lastPlayed > best.lastPlayed)) best = { entry, lastPlayed };
  }
  return best ? { entry: best.entry, daysAgo: Math.max(0, localDaysAgo(best.lastPlayed, now)) } : null;
}

// Minutes played so far today.
export function minutesToday(sessions: SessionTime[], now: Date): number {
  return weekDays(sessions, now).find((day) => day.isToday)?.minutes ?? 0;
}

export type SessionGroup<Session> = { label: string; sessions: Session[] };

// The practice log's sections, newest first: "This week", "Last week", then one per month.
export function groupSessions<Session extends SessionTime>(sessions: Session[], now: Date): SessionGroup<Session>[] {
  const thisWeek = daysAgo(now, daysSinceMonday(now)).getTime();
  const lastWeek = daysAgo(now, daysSinceMonday(now) + 7).getTime();
  const labelFor = (date: Date) => {
    if (date.getTime() >= thisWeek) return 'This week';
    if (date.getTime() >= lastWeek) return 'Last week';
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const groups: SessionGroup<Session>[] = [];
  const newestFirst = [...sessions].sort(
    (a, b) => new Date(b.practiced_at).getTime() - new Date(a.practiced_at).getTime(),
  );
  for (const session of newestFirst) {
    const label = labelFor(new Date(session.practiced_at));
    const last = groups.at(-1);
    if (last?.label === label) last.sessions.push(session);
    else groups.push({ label, sessions: [session] });
  }
  return groups;
}

// "Today", "Yesterday", or "Fri 9 Oct".
export function dayLabel(iso: string, now: Date): string {
  const relative = relativeDay(iso, now);
  if (relative === 'today') return 'Today';
  if (relative === 'yesterday') return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export type Milestone = { kind: 'sessions'; count: number } | { kind: 'streak'; days: number };
export type Progress = { sessions: number; streak: number };

const SESSION_MILESTONES = [1, 10, 25, 50, 100, 250, 500];
const STREAK_MILESTONES = [7, 30, 100, 365];

// The milestone a save just reached, if any. A streak milestone wins over a session count.
export function crossedMilestone(before: Progress, after: Progress): Milestone | null {
  const reached = (marks: number[], from: number, to: number) =>
    marks.filter((mark) => from < mark && mark <= to).at(-1);
  const days = reached(STREAK_MILESTONES, before.streak, after.streak);
  if (days !== undefined) return { kind: 'streak', days };
  const count = reached(SESSION_MILESTONES, before.sessions, after.sessions);
  return count === undefined ? null : { kind: 'sessions', count };
}
