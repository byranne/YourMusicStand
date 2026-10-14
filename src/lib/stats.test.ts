import { describe, expect, it } from 'vitest';

import type { SongStatus } from './database.types';
import {
  bestStreak,
  brushUps,
  crossedMilestone,
  currentStreak,
  dayLabel,
  daysPlayedThisWeek,
  groupSessions,
  jumpBackIn,
  lastPlayedSong,
  minutesThisWeek,
  minutesToday,
  recentSongs,
  relativeDay,
  songTotals,
  streakStatus,
  topSongsThisWeek,
  totalMinutes,
  weekComparison,
  weekDays,
  type PracticeSession,
} from './stats';

const now = new Date(2026, 9, 13, 20, 0); // Tue 13 Oct 2026, local
const day = (offset: number, hour = 9) => new Date(2026, 9, 13 - offset, hour).toISOString();
const played = (offset: number, minutes = 30) => ({ practiced_at: day(offset), duration_min: minutes });

describe('weekDays', () => {
  it('lists Monday to Sunday of the current week, with minutes summed per day', () => {
    const days = weekDays([played(0, 20), played(0, 10), played(1, 45)], now);
    expect(days).toHaveLength(7);
    expect(days.map((entry) => entry.date.getDate())).toEqual([12, 13, 14, 15, 16, 17, 18]);
    expect(days[0].minutes).toBe(45);
    expect(days[1].minutes).toBe(30);
    expect(days[2].minutes).toBe(0);
  });
  it('marks today and the days still to come', () => {
    const days = weekDays([], now);
    expect(days.map((entry) => entry.isToday)).toEqual([false, true, false, false, false, false, false]);
    expect(days.map((entry) => entry.isFuture)).toEqual([false, false, true, true, true, true, true]);
  });
  it('ends the week on Sunday', () => {
    const sunday = new Date(2026, 9, 18, 20, 0);
    const days = weekDays([], sunday);
    expect(days[0].date.getDate()).toBe(12);
    expect(days[6].isToday).toBe(true);
    expect(days.some((entry) => entry.isFuture)).toBe(false);
  });
  it('lists an earlier week, with no day marked as today or still to come', () => {
    const days = weekDays([played(8, 25)], now, 1);
    expect(days.map((entry) => entry.date.getDate())).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(days[0].minutes).toBe(25);
    expect(days.some((entry) => entry.isToday || entry.isFuture)).toBe(false);
  });
});

describe('weekComparison', () => {
  it('counts last week only up to the same weekday', () => {
    // Tuesday: last week's Monday and Tuesday count, its Wednesday does not.
    const sessions = [played(0, 20), played(1, 10), played(8, 15), played(7, 5), played(6, 99)];
    expect(weekComparison(sessions, now)).toEqual({ thisWeek: 30, lastWeekSoFar: 20 });
  });
});

describe('daysPlayedThisWeek', () => {
  it('counts each day once, this week only', () => {
    expect(daysPlayedThisWeek([played(0), played(0), played(1), played(2)], now)).toBe(2);
  });
});

describe('minutesThisWeek', () => {
  it('counts only the current Monday-to-Sunday week', () => {
    // Tuesday: yesterday (Monday) counts, the Sunday before does not.
    expect(minutesThisWeek([played(0, 20), played(1, 10), played(2, 99)], now)).toBe(30);
  });
});

describe('totalMinutes', () => {
  it('adds up every session', () => {
    expect(totalMinutes([played(0, 20), played(40, 15)])).toBe(35);
  });
});

describe('currentStreak', () => {
  it('is 0 with no sessions', () => {
    expect(currentStreak([], now)).toBe(0);
  });
  it('counts consecutive days including today', () => {
    expect(currentStreak([played(0), played(1), played(2), played(4)], now)).toBe(3);
  });
  it('survives not having played yet today', () => {
    expect(currentStreak([played(1), played(2)], now)).toBe(2);
  });
  it('breaks after a missed day', () => {
    expect(currentStreak([played(2), played(3)], now)).toBe(0);
  });
  it('counts several sessions on one day once', () => {
    expect(currentStreak([played(0), played(0), played(1)], now)).toBe(2);
  });
});

describe('streakStatus', () => {
  it('knows when today is still to play', () => {
    expect(streakStatus([played(1), played(2)], now)).toEqual({ count: 2, playedToday: false });
    expect(streakStatus([played(0), played(1)], now)).toEqual({ count: 2, playedToday: true });
  });
});

describe('bestStreak', () => {
  it('is 0 with no sessions', () => {
    expect(bestStreak([])).toBe(0);
  });
  it('finds the longest run, even an old one', () => {
    expect(bestStreak([played(0), played(1), played(10), played(11), played(11), played(12), played(20)])).toBe(3);
  });
});

const session = (offset: number, minutes: number, ids: string[]): PracticeSession =>
  ({
    id: `s${offset}`,
    practiced_at: day(offset),
    duration_min: minutes,
    songs: ids.map((user_song_id) => ({ user_song_id })),
  }) as PracticeSession;

describe('songTotals', () => {
  it('splits a session evenly across its songs and tracks the last play', () => {
    const totals = songTotals([session(3, 30, ['a', 'b']), session(1, 20, ['a']), session(0, 10, [])]);
    expect(totals.get('a')).toEqual({ sessions: 2, minutes: 35, lastPlayed: day(1) });
    expect(totals.get('b')).toEqual({ sessions: 1, minutes: 15, lastPlayed: day(3) });
    expect(totals.size).toBe(2);
  });
});

describe('topSongsThisWeek', () => {
  it('ranks this week\'s songs by their share of the minutes', () => {
    // Sunday's session (2 days ago) belongs to last week.
    const sessions = [session(0, 30, ['a', 'b']), session(1, 20, ['b']), session(2, 90, ['c'])];
    expect(topSongsThisWeek(sessions, now)).toEqual([
      { userSongId: 'b', minutes: 35 },
      { userSongId: 'a', minutes: 15 },
    ]);
  });
  it('keeps to the limit', () => {
    const sessions = [session(0, 30, ['a']), session(1, 20, ['b'])];
    expect(topSongsThisWeek(sessions, now, 1)).toEqual([{ userSongId: 'a', minutes: 30 }]);
  });
  it('breaks a tie on minutes by sessions, then by the latest play', () => {
    const sessions = [session(1, 20, ['a', 'b']), session(0, 10, ['c']), session(0, 5, ['d']), session(1, 5, ['d'])];
    expect(topSongsThisWeek(sessions, now, 4).map((top) => top.userSongId)).toEqual(['d', 'c', 'a', 'b']);
  });
});

describe('relativeDay', () => {
  it('names today, yesterday and older days', () => {
    expect(relativeDay(day(0), now)).toBe('today');
    expect(relativeDay(day(1), now)).toBe('yesterday');
    expect(relativeDay(day(4), now)).toBe('4 days ago');
  });
});

describe('jumpBackIn', () => {
  const entry = (id: string, status: SongStatus = 'learning') => ({ id, status });

  it('offers the most recently played songs of any status, then unplayed learning ones', () => {
    const entries = [entry('new'), entry('old'), entry('done', 'learned'), entry('recent')];
    const sessions = [session(5, 30, ['old']), session(1, 30, ['recent', 'done'])];
    expect(jumpBackIn(entries, sessions).map((item) => item.id)).toEqual(['recent', 'done', 'old']);
    expect(jumpBackIn(entries, sessions, 4).map((item) => item.id)).toEqual(['recent', 'done', 'old', 'new']);
  });
  it('orders songs from one session by status, then by time practiced', () => {
    const entries = [entry('a', 'learned'), entry('b', 'learned'), entry('c'), entry('d', 'want_to_learn')];
    const sessions = [session(1, 40, ['a', 'b', 'c', 'd']), session(6, 30, ['b'])];
    expect(jumpBackIn(entries, sessions).map((item) => item.id)).toEqual(['c', 'b', 'a']);
  });
  it('leaves out shelved songs and unplayed ones that are not being learned', () => {
    const entries = [entry('shelved', 'shelved'), entry('want', 'want_to_learn'), entry('done', 'learned')];
    expect(jumpBackIn(entries, [session(1, 30, ['shelved'])])).toEqual([]);
  });
  it('keeps to the limit', () => {
    expect(jumpBackIn([entry('a'), entry('b'), entry('c')], [], 2)).toHaveLength(2);
  });
});

describe('brushUps', () => {
  const entry = (id: string, status: SongStatus, learnedDaysAgo: number | null = null) => ({
    id,
    status,
    learned_at: learnedDaysAgo === null ? null : day(learnedDaysAgo),
  });

  it('offers learned songs untouched for a month, the longest-neglected first', () => {
    const entries = [
      entry('fresh', 'learned', 90),
      entry('stale', 'learned', 90),
      entry('staler', 'learned', 90),
      entry('unplayed', 'learned', 45),
      entry('justLearned', 'learned', 3),
      entry('learning', 'learning'),
    ];
    const sessions = [
      session(2, 30, ['fresh']),
      session(40, 30, ['stale', 'justLearned', 'learning']),
      session(60, 30, ['staler']),
    ];
    expect(brushUps(entries, sessions, now, 5)).toEqual([
      { entry: entries[2], since: day(60) },
      { entry: entries[3], since: day(45) },
      { entry: entries[1], since: day(40) },
    ]);
    expect(brushUps(entries, sessions, now)).toHaveLength(2);
  });
});

describe('recentSongs', () => {
  const entry = (id: string, status: SongStatus = 'learning') => ({ id, status });

  it('puts played songs first by recency, then unplayed learning songs, and drops shelved', () => {
    const entries = [
      entry('want', 'want_to_learn'),
      entry('new'),
      entry('shelved', 'shelved'),
      entry('old', 'learned'),
      entry('recent', 'want_to_learn'),
    ];
    const sessions = [session(5, 30, ['old']), session(1, 30, ['recent', 'shelved'])];
    expect(recentSongs(entries, sessions).map((item) => item.id)).toEqual(['recent', 'old', 'new', 'want']);
  });
  it('keeps to the limit', () => {
    expect(recentSongs([entry('a'), entry('b'), entry('c')], [], 2)).toHaveLength(2);
  });
});

describe('lastPlayedSong', () => {
  const entries = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('finds the most recently practiced entry and how long ago, or null', () => {
    const sessions = [session(4, 30, ['a']), session(2, 30, ['b'])];
    expect(lastPlayedSong(entries, sessions, now)).toEqual({ entry: { id: 'b' }, daysAgo: 2 });
    expect(lastPlayedSong(entries, [], now)).toBeNull();
  });
  it('looks past a later session that had no songs', () => {
    const sessions = [session(3, 30, ['a']), session(0, 30, [])];
    expect(lastPlayedSong(entries, sessions, now)).toEqual({ entry: { id: 'a' }, daysAgo: 3 });
  });
});

describe('minutesToday', () => {
  it('adds up only today', () => {
    expect(minutesToday([session(0, 20, []), session(0, 10, []), session(1, 40, [])], now)).toBe(30);
  });
});

describe('groupSessions', () => {
  it('splits into this week, last week and months, newest first', () => {
    // now is Tue 13 Oct: Monday 12th is this week, the 11th and 5th last week, September earlier.
    const groups = groupSessions([played(30), played(2), played(0), played(8), played(1)], now);
    expect(groups.map((group) => group.sessions.length)).toEqual([2, 2, 1]);
    expect(groups[0].label).toBe('This week');
    expect(groups[1].label).toBe('Last week');
    expect(groups[0].sessions[0].practiced_at).toBe(day(0));
  });
});

describe('dayLabel', () => {
  it('names today and yesterday', () => {
    expect(dayLabel(day(0), now)).toBe('Today');
    expect(dayLabel(day(1), now)).toBe('Yesterday');
    expect(dayLabel(day(4), now)).not.toMatch(/ago/);
  });
});

describe('crossedMilestone', () => {
  it('celebrates the first session and round session counts', () => {
    expect(crossedMilestone({ sessions: 0, streak: 0 }, { sessions: 1, streak: 1 })).toEqual({ kind: 'sessions', count: 1 });
    expect(crossedMilestone({ sessions: 9, streak: 0 }, { sessions: 10, streak: 1 })).toEqual({ kind: 'sessions', count: 10 });
    expect(crossedMilestone({ sessions: 10, streak: 1 }, { sessions: 11, streak: 1 })).toBeNull();
  });
  it('prefers a streak milestone over a session count', () => {
    expect(crossedMilestone({ sessions: 24, streak: 6 }, { sessions: 25, streak: 7 })).toEqual({ kind: 'streak', days: 7 });
  });
  it('catches a streak that jumps past a mark, as a back-dated session can', () => {
    expect(crossedMilestone({ sessions: 40, streak: 5 }, { sessions: 41, streak: 9 })).toEqual({ kind: 'streak', days: 7 });
  });
  it('ignores a streak that stays the same or drops', () => {
    expect(crossedMilestone({ sessions: 3, streak: 7 }, { sessions: 4, streak: 7 })).toBeNull();
  });
});
