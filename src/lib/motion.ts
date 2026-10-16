// Timing math for the UI's JS-driven motion (count-ups). CSS keyframes cover the rest.

// Fast start, gentle landing: 0 → 0, 1 → 1.
export function easeOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - clamped) ** 3;
}

// The whole number shown at progress t (0–1) of a count from `from` to `to`.
export function countUpValue(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * easeOutCubic(t));
}

const STAGGER_MS = 60;
const MAX_STAGGERED = 8;

// Entrance delay for the i-th item of a list. Items past the first few come in together,
// so a long list never waits on its tail.
export function staggerDelay(index: number, step = STAGGER_MS): number {
  return Math.min(Math.max(index, 0), MAX_STAGGERED) * step;
}
