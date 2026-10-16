import { describe, expect, it } from 'vitest';

import { countUpValue, easeOutCubic, staggerDelay } from './motion';

describe('easeOutCubic', () => {
  it('starts at 0 and ends at 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('is past halfway at the midpoint', () => {
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
  });

  it('clamps progress outside 0–1', () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });
});

describe('countUpValue', () => {
  it('lands exactly on the target', () => {
    expect(countUpValue(0, 137, 1)).toBe(137);
  });

  it('starts at the start', () => {
    expect(countUpValue(20, 90, 0)).toBe(20);
  });

  it('counts down as well as up', () => {
    expect(countUpValue(100, 0, 0.5)).toBe(13);
  });

  it('shows whole numbers on the way', () => {
    expect(Number.isInteger(countUpValue(0, 7, 0.37))).toBe(true);
  });
});

describe('staggerDelay', () => {
  it('steps each item later', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3)).toBe(180);
  });

  it('caps long lists', () => {
    expect(staggerDelay(50)).toBe(staggerDelay(8));
  });

  it('takes a custom step', () => {
    expect(staggerDelay(2, 100)).toBe(200);
  });
});
