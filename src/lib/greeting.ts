import { formatMinutes } from './practice';

export type MascotMood = 'idle' | 'happy' | 'sleepy' | 'celebrate';

export type GreetingContext = {
  hour: number;
  streak: { count: number; playedToday: boolean };
  // Whole days since the last session; null when there has never been one.
  daysSinceLast: number | null;
  sessionCount: number;
  // The Learning song to suggest next, if any.
  songTitle: string | null;
  // The song practiced most recently and how many days ago, if any.
  lastSong: { title: string; daysAgo: number } | null;
  // The song with the most time this week, if any.
  topSongTitle: string | null;
  todayMinutes: number;
  weekMinutes: number;
  lastWeekSoFar: number;
};

export type Greeting = { text: string; mood: MascotMood };

// Null when the line needs data this person doesn't have yet.
type Variant = (context: GreetingContext) => string | null;

const buckets = {
  first: {
    mood: 'happy',
    variants: [
      () => "Hi! Let's tackle it together.",
      () => 'Ready when you are. First session?',
      () => "Let's make some noise.",
      () => 'Day one of something great.',
      () => 'Tune up. This is going to be fun.',
    ],
  },
  hype: {
    mood: 'celebrate',
    variants: [
      ({ streak }) => `${streak.count} days strong. Keep the flame going!`,
      ({ streak }) => `${streak.count} days in a row. You're on fire.`,
      ({ streak }) => `Day ${streak.count}! Nothing can stop you.`,
      ({ streak, weekMinutes, lastWeekSoFar }) =>
        weekMinutes > lastWeekSoFar && lastWeekSoFar > 0
          ? `${streak.count} days running, and ${formatMinutes(weekMinutes)} this week. Ahead of last week!`
          : null,
    ],
  },
  playedToday: {
    mood: 'happy',
    variants: [
      ({ todayMinutes }) => (todayMinutes > 0 ? `${formatMinutes(todayMinutes)} in today. Encore?` : null),
      ({ lastSong }) => (lastSong?.daysAgo === 0 ? `Nice work on ${lastSong.title}. Encore?` : null),
      ({ streak }) => (streak.count > 1 ? `Day ${streak.count} done. Encore?` : null),
      () => 'Nice work today. Encore?',
      () => "That's today done. Proud of you.",
      () => 'Fingers warm? One more song?',
    ],
  },
  streakAlive: {
    mood: 'idle',
    variants: [
      ({ streak }) => `Play today to keep your ${streak.count}-day streak.`,
      ({ streak, lastSong }) =>
        lastSong ? `Pick ${lastSong.title} back up to keep your ${streak.count}-day streak.` : null,
      ({ songTitle }) => (songTitle ? `${songTitle} is up next. Let's go!` : null),
      () => "Let's keep it going.",
      () => 'Quick 10 minutes? We got this.',
      () => "Five minutes still counts. Let's play!",
    ],
  },
  gap: {
    mood: 'sleepy',
    variants: [
      ({ lastSong }) =>
        lastSong && lastSong.daysAgo > 1
          ? `${lastSong.title} was the last thing you played, ${lastSong.daysAgo} days ago.`
          : null,
      () => 'Your guitar misses you.',
      ({ daysSinceLast }) => `It's been ${daysSinceLast} days. Dust it off?`,
      ({ songTitle }) => (songTitle ? `${songTitle} has been waiting.` : null),
      () => 'Zzz... wake me with a chord?',
    ],
  },
  morning: {
    mood: 'idle',
    variants: [
      ({ topSongTitle }) => (topSongTitle ? `Morning! ${topSongTitle} is your top song this week.` : null),
      () => 'Good morning! Warm up with me?',
      () => "Morning! Let's tackle today together.",
    ],
  },
  evening: {
    mood: 'idle',
    variants: [
      ({ topSongTitle }) => (topSongTitle ? `Wind down with ${topSongTitle}?` : null),
      () => 'Evening jam? I like it.',
      () => 'Wind down with a song?',
    ],
  },
  day: {
    mood: 'idle',
    variants: [
      ({ topSongTitle }) => (topSongTitle ? `${topSongTitle} is your top song this week. Back at it?` : null),
      () => "What's on the stand today?",
      () => "Let's tackle it together.",
      () => 'Pick a song, any song.',
      () => 'Your guitar is calling.',
    ],
  },
} satisfies Record<string, { mood: MascotMood; variants: Variant[] }>;

export type GreetingBucket = keyof typeof buckets;

export function greetingBucket(context: GreetingContext): GreetingBucket {
  const { streak, sessionCount, daysSinceLast, hour } = context;
  if (sessionCount === 0) return 'first';
  if (streak.count >= 7) return 'hype';
  if (streak.playedToday) return 'playedToday';
  if (streak.count > 0) return 'streakAlive';
  if (daysSinceLast !== null && daysSinceLast >= 3) return 'gap';
  if (hour < 12) return 'morning';
  if (hour >= 18) return 'evening';
  return 'day';
}

// The same seed and context always give the same line, so it doesn't change on re-render.
export function pickGreeting(context: GreetingContext, seed: number): Greeting {
  const { mood, variants } = buckets[greetingBucket(context)];
  // Lines that need data this person lacks drop out, leaving the generic ones.
  const lines = variants.flatMap((variant) => variant(context) ?? []);
  return { text: lines[Math.abs(Math.trunc(seed)) % lines.length], mood };
}

export const greetingVariantCounts = Object.fromEntries(
  Object.entries(buckets).map(([name, { variants }]) => [name, variants.length]),
) as Record<GreetingBucket, number>;
