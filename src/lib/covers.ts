// Uploaded covers for custom songs. A phone photo is shrunk to a small JPEG
// before upload, so a cover costs tens of KB of the 50 MB allowance.

// Longest side of a stored cover, in pixels. Covers show at most 112 CSS px wide.
export const COVER_MAX_PX = 600;
const COVER_QUALITY = 0.85;

// Scale (width, height) to fit within max on the longest side, never enlarging.
export function coverDimensions(width: number, height: number, max = COVER_MAX_PX): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// The object name for a cover. The first folder is the owner (the storage
// policies check it), and the songs table only accepts paths under covers/.
export function coverPathFor(userId: string, uniqueId: string): string {
  return `${userId}/covers/${uniqueId}.jpg`;
}

// Any image the browser can decode (iOS hands over HEIC photos as JPEG) as a
// small JPEG. Browser-only: it draws on a canvas.
export async function shrinkCover(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = coverDimensions(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read the image.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not read the image.'))),
      'image/jpeg',
      COVER_QUALITY,
    );
  });
}
