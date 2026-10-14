import { describe, expect, it } from 'vitest';

import {
  greetingBucket,
  greetingVariantCounts,
  pickGreeting,
  type GreetingBucket,
  type GreetingContext,
} from './greeting';

const base: GreetingContext = {
  hour: 14,
  streak: { count: 0, playedToday: false },
  daysSinceLast: 1,
  sessionCount: 5,
  songTitle: 'Wonderwall',
  lastSong: { title: 'Blackbird', daysAgo: 0 },
  topSongTitle: 'Wonderwall',
  todayMinutes: 25,
  weekMinutes: 90,
  lastWeekSoFar: 60,
  name: null,
  weeklyGoal: null,
};

const withContext = (patch: Partial<GreetingContext>): GreetingContext => ({ ...base, ...patch });

describe('greetingBucket', () => {
  it.each<[string, GreetingContext, GreetingBucket]>([
    ['no sessions yet', withContext({ sessionCount: 0, daysSinceLast: null }), 'first'],
    ['a week-long streak', withContext({ streak: { count: 7, playedToday: false } }), 'hype'],
    ['played today', withContext({ streak: { count: 2, playedToday: true } }), 'playedToday'],
    ['streak alive but not played', withContext({ streak: { count: 2, playedToday: false } }), 'streakAlive'],
    ['a 3-day gap', withContext({ daysSinceLast: 3 }), 'gap'],
    ['morning', withContext({ hour: 9 }), 'morning'],
    ['afternoon', withContext({ hour: 14 }), 'day'],
    ['evening', withContext({ hour: 20 }), 'evening'],
  ])('%s', (_name, context, bucket) => {
    expect(greetingBucket(context)).toBe(bucket);
  });
});

describe('pickGreeting', () => {
  it('is deterministic for a seed', () => {
    expect(pickGreeting(base, 42)).toEqual(pickGreeting(base, 42));
  });

  it('gives every variant of every bucket a non-empty line', () => {
    const contexts: Record<GreetingBucket, GreetingContext> = {
      first: withContext({ sessionCount: 0, daysSinceLast: null }),
      hype: withContext({ streak: { count: 9, playedToday: true } }),
      playedToday: withContext({ streak: { count: 2, playedToday: true } }),
      streakAlive: withContext({ streak: { count: 2, playedToday: false } }),
      gap: withContext({ daysSinceLast: 5 }),
      morning: withContext({ hour: 8 }),
      evening: withContext({ hour: 21 }),
      day: base,
    };
    for (const [bucket, context] of Object.entries(contexts) as [GreetingBucket, GreetingContext][]) {
      for (let seed = 0; seed < greetingVariantCounts[bucket]; seed += 1) {
        expect(pickGreeting(context, seed).text.length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back when there is no song to suggest', () => {
    const context = withContext({ daysSinceLast: 5, songTitle: null });
    for (let seed = 0; seed < greetingVariantCounts.gap; seed += 1) {
      expect(pickGreeting(context, seed).text).not.toContain('null');
    }
  });

  it('uses what you played in the line', () => {
    const lines = new Set<string>();
    const played = withContext({ streak: { count: 2, playedToday: true } });
    for (let seed = 0; seed < 8; seed += 1) lines.add(pickGreeting(played, seed).text);
    expect(lines).toContain('25 min in today. Encore?');
    expect(lines).toContain('Nice work on Blackbird. Encore?');
  });

  it("doesn't credit today with a song from an earlier day", () => {
    const context = withContext({
      streak: { count: 2, playedToday: true },
      lastSong: { title: 'Blackbird', daysAgo: 1 },
    });
    for (let seed = 0; seed < greetingVariantCounts.playedToday; seed += 1) {
      expect(pickGreeting(context, seed).text).not.toContain('Blackbird');
    }
  });

  it('keeps every bucket working with no data to personalize', () => {
    const empty = {
      songTitle: null,
      lastSong: null,
      topSongTitle: null,
      todayMinutes: 0,
      weekMinutes: 0,
      lastWeekSoFar: 0,
    };
    const contexts = [
      withContext({ ...empty, streak: { count: 9, playedToday: true } }),
      withContext({ ...empty, streak: { count: 1, playedToday: true } }),
      withContext({ ...empty, streak: { count: 2, playedToday: false } }),
      withContext({ ...empty, daysSinceLast: 5 }),
      withContext({ ...empty, hour: 8 }),
      withContext({ ...empty, hour: 21 }),
      withContext(empty),
    ];
    for (const context of contexts) {
      for (let seed = 0; seed < 8; seed += 1) {
        expect(pickGreeting(context, seed).text.length).toBeGreaterThan(0);
        expect(pickGreeting(context, seed).text).not.toMatch(/null|undefined/);
      }
    }
  });

  it('is sleepy after a gap and celebrating on a long streak', () => {
    expect(pickGreeting(withContext({ daysSinceLast: 5 }), 0).mood).toBe('sleepy');
    expect(pickGreeting(withContext({ streak: { count: 8, playedToday: true } }), 0).mood).toBe('celebrate');
  });
});

describe('personal lines', () => {
  const linesFor = (context: GreetingContext, bucket: GreetingBucket) =>
    Array.from({ length: greetingVariantCounts[bucket] }, (_, seed) => pickGreeting(context, seed).text);

  it('greets by name only when there is one', () => {
    expect(linesFor(withContext({ hour: 9, name: 'Bryan' }), 'morning').some((line) => line.includes('Bryan'))).toBe(true);
    expect(linesFor(withContext({ hour: 9 }), 'morning').join(' ')).not.toContain('null');
  });

  it('mentions the minutes left to a weekly goal', () => {
    const lines = linesFor(withContext({ weeklyGoal: 120, weekMinutes: 90 }), 'day');
    expect(lines.some((line) => line.includes('30 min to go'))).toBe(true);
  });

  it('drops goal lines without a goal or once it is met', () => {
    expect(linesFor(withContext({ weeklyGoal: null }), 'day').join(' ')).not.toContain('goal');
    expect(linesFor(withContext({ weeklyGoal: 60, weekMinutes: 90 }), 'day').join(' ')).not.toContain('goal');
  });
});
