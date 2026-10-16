import { describe, expect, it } from 'vitest';

import { arcPose, arcSlots, clampDrag, frontIndex, turnTo, VISIBLE_SPAN } from './coverFlow';

describe('arcPose', () => {
  it('shows the front cover flat, full size, on top and in the middle', () => {
    expect(arcPose(0)).toEqual({ x: 0, y: 0, rotateY: 0, scale: 1, opacity: 1, zIndex: 100 });
  });

  it('places side covers to either side, smaller, a little turned in', () => {
    const left = arcPose(-1);
    const right = arcPose(1);
    expect(left.x).toBeLessThan(0);
    expect(right.x).toBe(-left.x);
    expect(left.rotateY).toBeGreaterThan(0);
    expect(right.rotateY).toBe(-left.rotateY);
    expect(Math.abs(right.rotateY)).toBeLessThan(30);
    expect(right.scale).toBeLessThan(1);
    expect(right.opacity).toBe(1);
    expect(right.zIndex).toBeLessThan(100);
  });

  it('fades the second covers out and hides any further', () => {
    expect(arcPose(2).opacity).toBeGreaterThan(0);
    expect(arcPose(2).opacity).toBeLessThan(1);
    expect(arcPose(VISIBLE_SPAN).opacity).toBe(0);
    expect(arcPose(-4).opacity).toBe(0);
    expect(arcPose(3).x).toBeGreaterThan(arcPose(2).x);
  });
});

describe('arcSlots', () => {
  it('draws only the covers near the front of a long list, looping round', () => {
    const slots = arcSlots(0, 10);
    expect(slots.map((slot) => slot.index)).toEqual([8, 9, 0, 1, 2]);
    expect(slots.map((slot) => slot.offset)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('keeps a cover\'s key as it slides, mid-drag too', () => {
    const before = arcSlots(3, 10).find((slot) => slot.index === 4);
    const after = arcSlots(3.5, 10).find((slot) => slot.index === 4);
    expect(after?.key).toBe(before?.key);
    expect(after?.offset).toBeCloseTo(0.5);
  });

  it('works any number of turns either way', () => {
    expect(arcSlots(-11, 10).find((slot) => slot.offset === 0)?.index).toBe(9);
    expect(arcSlots(23, 10).find((slot) => slot.offset === 0)?.index).toBe(3);
  });

  it('shows each song of a short list once, the front one in the middle', () => {
    const three = arcSlots(0, 3);
    expect(three.map((slot) => [slot.index, slot.offset])).toEqual([
      [0, 0],
      [1, 1],
      [2, -1],
    ]);
    expect(arcSlots(5, 3).find((slot) => slot.offset === 0)?.index).toBe(2);
    expect(arcSlots(0, 2).map((slot) => slot.index)).toEqual([0, 1]);
    expect(new Set(arcSlots(1.5, 4).map((slot) => slot.index)).size).toBe(4);
  });

  it('keys a short list by song, so each cover keeps its element as it goes round', () => {
    for (const rotation of [0, 1, 2, 7, -3]) {
      expect(arcSlots(rotation, 3).map((slot) => slot.key)).toEqual([0, 1, 2]);
    }
  });

  it('shows a single cover alone, and nothing for none', () => {
    expect(arcSlots(0, 1)).toEqual([{ key: 0, index: 0, offset: 0 }]);
    expect(arcSlots(0, 0)).toEqual([]);
  });
});

describe('turnTo and clampDrag', () => {
  it('keeps going round a long list', () => {
    expect(turnTo(9, 1, 10)).toBe(10);
    expect(turnTo(0, -1, 10)).toBe(-1);
  });

  it('keeps going round a short list instead of jumping back to the start', () => {
    expect(turnTo(2, 1, 3)).toBe(3);
    expect(turnTo(0, -1, 3)).toBe(-1);
    expect(turnTo(1.4, 1, 2)).toBe(2);
    expect(turnTo(0, 1, 1)).toBe(0);
  });

  it('only limits dragging a single cover', () => {
    expect(clampDrag(-3, 1)).toBe(-0.4);
    expect(clampDrag(5, 1)).toBeCloseTo(0.4);
    expect(clampDrag(-3, 3)).toBe(-3);
  });
});

describe('frontIndex', () => {
  it('finds the cover at the front after any number of turns', () => {
    expect(frontIndex(0, 5)).toBe(0);
    expect(frontIndex(6, 5)).toBe(1);
    expect(frontIndex(-1, 5)).toBe(4);
    expect(frontIndex(2.4, 5)).toBe(2);
    expect(frontIndex(3, 0)).toBe(0);
  });
});
