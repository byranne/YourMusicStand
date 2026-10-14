// The square crop picked in the image cropper, in the source image's pixels.
// Keeping the state in source pixels means it doesn't depend on how big the
// cropper is drawn on screen.
export type Crop = { x: number; y: number; size: number };

// How far in the cropper zooms, relative to the whole short side.
export const MAX_ZOOM = 4;

// The largest centered square: where the cropper starts.
export function initialCrop(width: number, height: number): Crop {
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

// Keeps the square inside the image and between 1x and MAX_ZOOM.
export function clampCrop(crop: Crop, width: number, height: number): Crop {
  const largest = Math.min(width, height);
  const size = Math.min(largest, Math.max(largest / MAX_ZOOM, crop.size));
  return {
    x: Math.min(width - size, Math.max(0, crop.x)),
    y: Math.min(height - size, Math.max(0, crop.y)),
    size,
  };
}

// Dragging the image by (dx, dy) screen pixels in a cropper viewSize pixels wide
// moves the square the opposite way.
export function panCrop(crop: Crop, dx: number, dy: number, viewSize: number, width: number, height: number): Crop {
  const scale = crop.size / viewSize;
  return clampCrop({ ...crop, x: crop.x - dx * scale, y: crop.y - dy * scale }, width, height);
}

export function zoomOf(crop: Crop, width: number, height: number): number {
  return Math.min(width, height) / crop.size;
}

// Zooms to `zoom`, keeping the point under the focus fixed. The focus is a
// fraction of the cropper (0.5, 0.5 is its center).
export function zoomCrop(
  crop: Crop,
  zoom: number,
  width: number,
  height: number,
  focus: { x: number; y: number } = { x: 0.5, y: 0.5 },
): Crop {
  const size = Math.min(width, height) / Math.min(MAX_ZOOM, Math.max(1, zoom));
  const anchor = { x: crop.x + focus.x * crop.size, y: crop.y + focus.y * crop.size };
  return clampCrop({ x: anchor.x - focus.x * size, y: anchor.y - focus.y * size, size }, width, height);
}
