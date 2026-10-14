import { describe, expect, it } from 'vitest';

import { clampCrop, initialCrop, MAX_ZOOM, panCrop, zoomCrop, zoomOf } from './crop';

describe('initialCrop', () => {
  it('is the largest centered square', () => {
    expect(initialCrop(3000, 4000)).toEqual({ x: 0, y: 500, size: 3000 });
    expect(initialCrop(4000, 3000)).toEqual({ x: 500, y: 0, size: 3000 });
  });
});

describe('clampCrop', () => {
  it('keeps the square inside the image', () => {
    expect(clampCrop({ x: -50, y: 900, size: 1000 }, 1000, 1500)).toEqual({ x: 0, y: 500, size: 1000 });
  });

  it('limits the zoom', () => {
    expect(clampCrop({ x: 0, y: 0, size: 5000 }, 1000, 1000).size).toBe(1000);
    expect(clampCrop({ x: 0, y: 0, size: 10 }, 1000, 1000).size).toBe(1000 / MAX_ZOOM);
  });
});

describe('panCrop', () => {
  it('moves the square against the drag, in source pixels', () => {
    // 300 px on screen shows 3000 source px, so 1 screen px is 10 source px.
    expect(panCrop({ x: 0, y: 500, size: 3000 }, 0, 20, 300, 3000, 4000)).toEqual({ x: 0, y: 300, size: 3000 });
  });

  it('stops at the edges', () => {
    expect(panCrop({ x: 0, y: 500, size: 3000 }, 0, 500, 300, 3000, 4000).y).toBe(0);
    expect(panCrop({ x: 0, y: 500, size: 3000 }, 100, 0, 300, 3000, 4000).x).toBe(0);
  });
});

describe('zoomCrop', () => {
  it('zooms around the center by default', () => {
    const zoomed = zoomCrop({ x: 0, y: 0, size: 1000 }, 2, 1000, 1000);
    expect(zoomed).toEqual({ x: 250, y: 250, size: 500 });
    expect(zoomOf(zoomed, 1000, 1000)).toBe(2);
  });

  it('keeps the point under the focus fixed', () => {
    const zoomed = zoomCrop({ x: 0, y: 0, size: 1000 }, 2, 1000, 1000, { x: 0, y: 0 });
    expect(zoomed).toEqual({ x: 0, y: 0, size: 500 });
  });

  it('zooming back out stays inside the image', () => {
    expect(zoomCrop({ x: 500, y: 500, size: 500 }, 1, 1000, 1000)).toEqual({ x: 0, y: 0, size: 1000 });
  });
});
