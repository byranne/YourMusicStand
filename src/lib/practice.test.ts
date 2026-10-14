import { describe, expect, it } from 'vitest';

import type { LibraryEntry } from './library';
import {
  adjustSeconds,
  dateInputValue,
  elapsedSeconds,
  formatClock,
  formatMinutes,
  formatSeconds,
  isProbablyAbandoned,
  pastSessionTime,
  pauseSession,
  playedMs,
  recapOrder,
  resumeSession,
  startSession,
  suggestedSongs,
  summarizeTitles,
  touchSong,
} from './practice';

const t0 = new Date(2026, 9, 13, 10, 0, 0);
const after = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);

describe('touchSong', () => {
  it('records songs in the order opened, once each, and refreshes lastSeenAt', () => {
    let session = startSession(t0);
    session = touchSong(session, 'a', after(1));
    session = touchSong(session, 'b', after(2));
    session = touchSong(session, 'a', after(3));
    expect(session.touched).toEqual(['a', 'b']);
    expect(session.lastSeenAt).toBe(after(3).toISOString());
    expect(session.startedAt).toBe(t0.toISOString());
  });
});

describe('elapsedSeconds', () => {
  it('counts whole seconds, like the clock', () => {
    expect(elapsedSeconds(startSession(t0), after(34))).toBe(34 * 60);
    expect(elapsedSeconds(startSession(t0), new Date(t0.getTime() + 754_900))).toBe(754);
  });
  it('is at least 1 second', () => {
    expect(elapsedSeconds(startSession(t0), after(0))).toBe(1);
  });
  it('is at most a day', () => {
    expect(elapsedSeconds(startSession(t0), after(5000))).toBe(86_400);
  });
  it('leaves out paused time', () => {
    const session = resumeSession(pauseSession(startSession(t0), after(10)), after(25));
    expect(elapsedSeconds(session, after(34))).toBe(19 * 60);
  });
});

describe('pausing', () => {
  it('stops the clock while paused', () => {
    const session = pauseSession(startSession(t0), after(10));
    expect(playedMs(session, after(10))).toBe(10 * 60_000);
    expect(playedMs(session, after(45))).toBe(10 * 60_000);
  });
  it('carries on from where it stopped after resuming', () => {
    let session = resumeSession(pauseSession(startSession(t0), after(10)), after(25));
    expect(session.pausedAt).toBeNull();
    expect(playedMs(session, after(30))).toBe(15 * 60_000);
    session = resumeSession(pauseSession(session, after(30)), after(32));
    expect(playedMs(session, after(40))).toBe(23 * 60_000);
  });
  it('ignores a second pause or a resume that has nothing to undo', () => {
    const paused = pauseSession(startSession(t0), after(10));
    expect(pauseSession(paused, after(20))).toBe(paused);
    const running = startSession(t0);
    expect(resumeSession(running, after(5))).toBe(running);
  });
  it('counts only up to an earlier end time', () => {
    const session = pauseSession(startSession(t0), after(20));
    expect(playedMs(session, after(15))).toBe(15 * 60_000);
  });
  it('reads a session stored before pausing existed', () => {
    const { startedAt, lastSeenAt, touched } = startSession(t0);
    expect(playedMs({ startedAt, lastSeenAt, touched }, after(7))).toBe(7 * 60_000);
  });
});

describe('isProbablyAbandoned', () => {
  it('is false within three hours of last activity', () => {
    expect(isProbablyAbandoned(startSession(t0), after(179))).toBe(false);
  });
  it('is true after more than three hours', () => {
    expect(isProbablyAbandoned(startSession(t0), after(181))).toBe(true);
  });
});

describe('suggestedSongs', () => {
  it('returns touched entries that still exist, in order', () => {
    const library = [{ id: 'a' }, { id: 'b' }] as LibraryEntry[];
    const session = { ...startSession(t0), touched: ['b', 'gone', 'a'] };
    expect(suggestedSongs(session, library).map((entry) => entry.id)).toEqual(['b', 'a']);
  });
});

describe('recapOrder', () => {
  it('puts opened songs first in the order opened, then the rest by status', () => {
    const library = [
      { id: 'shelved', status: 'shelved' },
      { id: 'learned', status: 'learned' },
      { id: 'want', status: 'want_to_learn' },
      { id: 'learning', status: 'learning' },
      { id: 'opened-2', status: 'shelved' },
      { id: 'opened-1', status: 'learned' },
    ] as LibraryEntry[];
    expect(recapOrder(library, ['opened-1', 'gone', 'opened-2']).map((entry) => entry.id)).toEqual([
      'opened-1',
      'opened-2',
      'learning',
      'want',
      'learned',
      'shelved',
    ]);
  });
});

describe('formatting', () => {
  it('formats the clock', () => {
    expect(formatClock(754_000)).toBe('12:34');
    expect(formatClock(3_723_000)).toBe('1:02:03');
    expect(formatClock(-5)).toBe('0:00');
  });
  it('formats minutes', () => {
    expect(formatMinutes(34)).toBe('34 min');
    expect(formatMinutes(80)).toBe('1 h 20 m');
    expect(formatMinutes(120)).toBe('2 h');
  });
  it('formats a session length to the second', () => {
    expect(formatSeconds(45)).toBe('0:45');
    expect(formatSeconds(754)).toBe('12:34');
    expect(formatSeconds(1800)).toBe('30:00');
    expect(formatSeconds(4805)).toBe('1:20:05');
  });
});

describe('pastSessionTime', () => {
  it('is now for today and local noon for an earlier day', () => {
    expect(dateInputValue(t0)).toBe('2026-10-13');
    expect(pastSessionTime('2026-10-13', t0)).toBe(t0);
    expect(pastSessionTime('2026-10-12', t0)).toEqual(new Date(2026, 9, 12, 12));
    expect(pastSessionTime('2026-09-03', t0)).toEqual(new Date(2026, 8, 3, 12));
  });
  it('falls back to now for a future or unreadable day', () => {
    expect(pastSessionTime('2026-10-14', t0)).toBe(t0);
    expect(pastSessionTime('', t0)).toBe(t0);
  });
});

describe('summarizeTitles', () => {
  it('lists the first titles and counts the rest', () => {
    expect(summarizeTitles([])).toBe('');
    expect(summarizeTitles(['A', 'B'])).toBe('A, B');
    expect(summarizeTitles(['A', 'B', 'C', 'D'])).toBe('A, B and 2 more');
  });
});

describe('adjustSeconds', () => {
  it('adds and removes whole minutes, keeping the seconds', () => {
    expect(adjustSeconds(754, 5)).toBe(1054);
    expect(adjustSeconds(754, 1)).toBe(814);
    expect(adjustSeconds(754, -1)).toBe(694);
    expect(adjustSeconds(754, -5)).toBe(454);
  });

  it('ignores a step that would leave nothing', () => {
    expect(adjustSeconds(45, -1)).toBe(45);
    expect(adjustSeconds(300, -5)).toBe(300);
    expect(adjustSeconds(301, -5)).toBe(1);
  });

  it('stops at a full day', () => {
    expect(adjustSeconds(86_400 - 60, 5)).toBe(86_400);
  });
});
