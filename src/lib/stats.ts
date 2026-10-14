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
  return [...songTotals(thisWeek)]
    .map(([userSongId, totals]) => ({ userSongId, minutes: totals.minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, limit);
}

// "today", "yesterday", "3 days ago", for a local calendar day.
export function relativeDay(iso: string, now: Date): string {
  const then = new Date(iso);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) /
      86_400_000,
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

// The Learning songs to offer next to Start: most recently practiced first,
// ones never practiced last.
export function jumpBackIn<Entry extends { id: string; status: SongStatus }>(
  entries: Entry[],
  sessions: PracticeSession[],
  limit = 3,
): Entry[] {
  const totals = songTotals(sessions);
  const lastPlayed = (entry: Entry) => totals.get(entry.id)?.lastPlayed ?? '';
  return entries
    .filter((entry) => entry.status === 'learning')
    .sort((a, b) => new Date(lastPlayed(b) || 0).getTime() - new Date(lastPlayed(a) || 0).getTime())
    .slice(0, limit);
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
