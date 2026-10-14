import { ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

import { Button, Sheet, Skeleton } from '@/components/ui';
import { initialCrop, MAX_ZOOM, panCrop, zoomCrop, zoomOf, type Crop } from '@/lib/crop';

type ImageCropperProps = {
  // The picked photo; the cropper is open while there is one.
  file: File | null;
  // A circle guide for profile pictures, a rounded square for covers.
  shape: 'circle' | 'square';
  title: string;
  onCancel: () => void;
  onConfirm: (crop: Crop) => void;
};

type Size = { width: number; height: number };

// A sheet over the current sheet for choosing the square part of a photo to
// keep: drag to move it, pinch, scroll or use the slider to zoom. Nothing is
// uploaded until the person confirms.
export function ImageCropper({ file, shape, title, onCancel, onConfirm }: ImageCropperProps) {
  return (
    <Sheet nested open={file !== null} onOpenChange={(open) => (open ? null : onCancel())} title={title}>
      {/* Keyed by the file, so a new photo starts from a fresh crop. */}
      {file ? (
        <CropArea
          key={`${file.name}-${file.lastModified}`}
          file={file}
          shape={shape}
          title={title}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      ) : null}
    </Sheet>
  );
}

function CropArea({ file, shape, title, onCancel, onConfirm }: Omit<ImageCropperProps, 'file'> & { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const [image, setImage] = useState<Size | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  // Fingers or the mouse currently on the image, by pointer id.
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Scrolling (trackpad or wheel) zooms around the cursor. A native listener,
  // because React's wheel events are passive and can't stop the sheet scrolling.
  useEffect(() => {
    const element = viewport.current;
    if (!element || !image) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const focus = focusAt(element, event.clientX, event.clientY);
      setCrop((current) =>
        current
          ? zoomCrop(
              current,
              zoomOf(current, image.width, image.height) * Math.exp(-event.deltaY * 0.002),
              image.width,
              image.height,
              focus,
            )
          : current,
      );
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [image]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = viewport.current;
    const previous = pointers.current.get(event.pointerId);
    if (!element || !previous || !image || !crop) return;
    const before = [...pointers.current.values()];
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const after = [...pointers.current.values()];

    if (after.length === 1) {
      setCrop(
        panCrop(
          crop,
          event.clientX - previous.x,
          event.clientY - previous.y,
          element.clientWidth,
          image.width,
          image.height,
        ),
      );
    } else if (after.length === 2) {
      // Pinch: zoom by how much the fingers spread, around the point between them.
      const spread = distance(after[0], after[1]) / Math.max(1, distance(before[0], before[1]));
      const middle = {
        x: (after[0].x + after[1].x) / 2,
        y: (after[0].y + after[1].y) / 2,
      };
      const zoom = zoomOf(crop, image.width, image.height) * spread;
      setCrop(zoomCrop(crop, zoom, image.width, image.height, focusAt(element, middle.x, middle.y)));
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
  };

  const zoom = crop && image ? zoomOf(crop, image.width, image.height) : 1;
  const setZoom = (next: number) => {
    if (crop && image) setCrop(zoomCrop(crop, next, image.width, image.height));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-text">{title}</h2>
        <p className="text-sm text-muted">Drag to move. Pinch or use the slider to zoom.</p>
      </div>

      <div
        ref={viewport}
        // Keeps vaul from treating a drag on the photo as dragging the sheet closed.
        data-vaul-no-drag
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mx-auto aspect-square w-full max-w-80 cursor-grab touch-none overflow-hidden rounded-3xl bg-background select-none active:cursor-grabbing"
      >
        {url ? (
          <img
            src={url}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
              setImage({ width, height });
              setCrop(initialCrop(width, height));
            }}
            // Placed in percentages of the (square) viewport, so it needs no measuring.
            style={
              crop && image
                ? {
                    left: `${(-crop.x / crop.size) * 100}%`,
                    top: `${(-crop.y / crop.size) * 100}%`,
                    width: `${(image.width / crop.size) * 100}%`,
                  }
                : { opacity: 0 }
            }
            className="pointer-events-none absolute max-w-none"
          />
        ) : null}
        {!crop ? <Skeleton className="absolute inset-0" /> : null}
        {/* The guide: a circle with the corners dimmed, or a rounded square outline. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 border-2 border-surface/80 ${
            shape === 'circle' ? 'rounded-full' : 'rounded-3xl'
          }`}
          style={
            shape === 'circle'
              ? {
                  boxShadow: '0 0 0 9999px color-mix(in srgb, var(--color-scrim) 50%, transparent)',
                }
              : undefined
          }
        />
      </div>

      <label className="flex items-center gap-3 text-muted">
        <ZoomOut className="size-5 shrink-0" aria-hidden />
        <span className="sr-only">Zoom</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          disabled={!crop}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="h-11 w-full accent-brand"
        />
        <ZoomIn className="size-5 shrink-0" aria-hidden />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Button label="Cancel" variant="secondary" onClick={onCancel} />
        <Button label="Use photo" disabled={!crop} onClick={() => crop && onConfirm(crop)} />
      </div>
    </div>
  );
}

// Where (clientX, clientY) falls in the element, as fractions of its size.
function focusAt(element: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
