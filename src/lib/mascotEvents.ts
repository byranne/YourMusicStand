import { useSyncExternalStore } from 'react';

import type { MascotMood } from './greeting';
import { formatMinutes } from './practice';
import type { Milestone } from './stats';

export type MascotEvent = 'sessionSaved' | 'songAdded' | 'songLearned' | 'streakUp' | 'milestone';

// What the event was about, for lines that name it.
export type ReactionDetail = { minutes?: number; streak?: number; milestone?: Milestone };

// Null when the line needs detail this reaction didn't get.
type Line = (detail: ReactionDetail) => string | null;

export const eventLines: Record<MascotEvent, Line[]> = {
  sessionSaved: [
    ({ minutes }) => (minutes ? `${formatMinutes(minutes)} in. Nice playing!` : null),
    ({ minutes }) => (minutes ? `${formatMinutes(minutes)} logged. Your fingers earned it.` : null),
    () => 'Session saved. Nice playing!',
    () => 'Logged! Your fingers earned it.',
    () => 'Saved. Great work!',
  ],
  songAdded: [() => 'New song on the stand!', () => "Added. Let's learn it together.", () => 'Ooh, good pick.'],
  songLearned: [() => 'Learned it! Time to show it off.', () => 'Another one mastered!', () => 'You nailed it!'],
  streakUp: [
    ({ streak }) => (streak && streak > 1 ? `Day ${streak}! Keep the flame going.` : null),
    ({ streak }) => (streak && streak > 1 ? `${streak} days in a row. That's the streak alive.` : null),
    ({ streak, minutes }) =>
      streak && streak > 1 && minutes ? `${formatMinutes(minutes)} for day ${streak}. Nice!` : null,
    () => 'Streak lit! Keep it going.',
    () => 'Another day on the flame!',
  ],
  milestone: [
    ({ milestone }) => {
      if (!milestone) return null;
      if (milestone.kind === 'streak') return `${milestone.days} days in a row! You're unstoppable.`;
      if (milestone.count === 1) return 'Your first session! This is the start of something.';
      return `Session #${milestone.count}! Look how far you've come.`;
    },
    () => 'Milestone reached!',
  ],
};

export const eventMoods: Record<MascotEvent, MascotMood> = {
  sessionSaved: 'happy',
  songAdded: 'happy',
  songLearned: 'celebrate',
  streakUp: 'celebrate',
  milestone: 'celebrate',
};

export const TOAST_MS = 2500;
// Milestones are rare, so they stay up long enough to enjoy.
export const MILESTONE_TOAST_MS = 4000;

// A line that names the detail beats a generic one; the generic lines cover a reaction without detail.
export function pickLine(event: MascotEvent, detail: ReactionDetail, seed: number): string {
  const lines = eventLines[event];
  const named = lines.flatMap((line) => (line({}) === null ? (line(detail) ?? []) : []));
  const generic = lines.flatMap((line) => line({}) ?? []);
  const pool = named.length > 0 ? named : generic;
  return pool[Math.abs(Math.trunc(seed)) % pool.length];
}

type Shown = { event: MascotEvent; mood: MascotMood; text: string; id: number };

let current: Shown | null = null;
let counter = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

// Show a reaction for a moment. A newer one replaces the one on screen.
export function react(event: MascotEvent, detail: ReactionDetail = {}): void {
  counter += 1;
  current = { event, mood: eventMoods[event], text: pickLine(event, detail, counter), id: counter };
  clearTimeout(timer);
  timer = setTimeout(
    () => {
      current = null;
      emit();
    },
    event === 'milestone' ? MILESTONE_TOAST_MS : TOAST_MS,
  );
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMascotReaction(): Shown | null {
  return useSyncExternalStore(subscribe, () => current);
}
