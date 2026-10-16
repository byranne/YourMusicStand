import { describe, expect, it } from 'vitest';

import { coverDimensions, coverPathFor } from './covers';

describe('coverDimensions', () => {
  it('shrinks the longest side to the maximum and keeps the aspect ratio', () => {
    expect(coverDimensions(4032, 3024, 600)).toEqual({ width: 600, height: 450 });
    expect(coverDimensions(3024, 4032, 600)).toEqual({ width: 450, height: 600 });
  });

  it('never enlarges a small image', () => {
    expect(coverDimensions(300, 200, 600)).toEqual({ width: 300, height: 200 });
  });

  it('keeps at least one pixel on a very thin image', () => {
    expect(coverDimensions(10000, 1, 600)).toEqual({ width: 600, height: 1 });
  });
});

describe('coverPathFor', () => {
  it('puts covers in the owner\'s covers folder', () => {
    expect(coverPathFor('user-1', 'abc')).toBe('user-1/covers/abc.jpg');
  });
});

