import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

import { CoverArt } from '@/components/ui';
import { arcPose, arcSlots, clampDrag, frontIndex, turnTo } from '@/lib/coverFlow';
import type { LibraryEntry } from '@/lib/library';

const COVER = 176; // CoverArt xl
// How far a finger moves to turn the arc by one cover.
const DRAG_PX_PER_COVER = 120;
// A press that moves less than this is a tap.
const TAP_SLOP = 6;
const ADVANCE_MS = 4500;
// Auto-turn waits this long after the last touch.
const IDLE_MS = 8000;

type CoverFlowProps = {
  title: string;
  entries: LibraryEntry[];
  onOpen: (entry: LibraryEntry) => void;
  // While something covers the page (a sheet), it holds still.
  paused?: boolean;
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The covers fan out in an arc: the front one big in the middle, the next ones
// smaller, slightly turned in and fading toward the sides. Turn it with the
// arrows or by dragging sideways (vertical swipes still scroll the page); it
// goes round forever, so the front cover is always in the middle. Tap the
// front cover to open the song, or a side one to bring it to the front. Left
// alone it slowly turns by itself. Only the covers near the front are drawn,
// so the list can be any length.
export function CoverFlow({ title, entries, onOpen, paused = false }: CoverFlowProps) {
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; rotation: number; moved: boolean; id: number } | null>(null);
  const lastTouch = useRef(0);

  const count = entries.length;
  const front = frontIndex(rotation, count);
  const current = entries[front];

  useEffect(() => {
    if (paused || count < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden || reducedMotion() || Date.now() - lastTouch.current < IDLE_MS) return;
      setRotation((value) => turnTo(value, 1, count));
    }, ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  if (!current) return null;

  const turn = (delta: number) => {
    lastTouch.current = Date.now();
    setRotation((value) => turnTo(value, delta, count));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (count < 2) return;
    lastTouch.current = Date.now();
    drag.current = { x: event.clientX, rotation, moved: false, id: event.pointerId };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    if (!start.moved && Math.abs(dx) < TAP_SLOP) return;
    if (!start.moved) {
      start.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    lastTouch.current = Date.now();
    setRotation(clampDrag(start.rotation - dx / DRAG_PX_PER_COVER, count));
  };
  // Lets go: settle on the nearest cover.
  const endDrag = () => {
    if (drag.current?.moved) setRotation((value) => turnTo(value, 0, count));
    setDragging(false);
    // Cleared after this event's click, which a drag swallows.
    setTimeout(() => {
      drag.current = null;
    });
  };

  return (
    <section className="mb-6" aria-label={title} aria-roledescription="carousel">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-text">{title}</h2>
        <span className="text-sm text-muted tabular-nums">
          {front + 1} / {count}
        </span>
      </div>

      {/* Bleeds to the screen edges so side covers can swing past the page padding. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(event) => {
          if (drag.current?.moved) {
            event.stopPropagation();
            event.preventDefault();
          }
        }}
        // isolate keeps the covers' z-index inside the arc, so sheets and the tab bar stay on top.
        className="relative isolate -mx-5 touch-pan-y overflow-hidden select-none"
        style={{ height: COVER + 24 }}
      >
        {arcSlots(rotation, count).map(({ key, index, offset }) => {
          const entry = entries[index];
          const pose = arcPose(offset);
          const isFront = Math.abs(offset) < 0.5;
          return (
            <button
              key={key}
              type="button"
              aria-label={isFront ? `Open ${entry.song.title}` : `Show ${entry.song.title}`}
              tabIndex={isFront ? 0 : -1}
              onClick={() => {
                if (isFront) return onOpen(entry);
                lastTouch.current = Date.now();
                setRotation((value) => Math.round(value + offset));
              }}
              className="absolute top-2 rounded-3xl ring-4 ring-background"
              style={{
                left: `calc(50% - ${COVER / 2}px)`,
                zIndex: pose.zIndex,
                opacity: pose.opacity,
                transform: `translate(${pose.x}px, ${pose.y}px) perspective(800px) rotateY(${pose.rotateY}deg) scale(${pose.scale})`,
                transition:
                  dragging || reducedMotion()
                    ? 'none'
                    : 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease-out',
                // Faded-out covers can't be tapped.
                pointerEvents: pose.opacity < 0.2 ? 'none' : undefined,
              }}
            >
              <CoverArt url={entry.song.cover_url} size="xl" eager />
            </button>
          );
        })}

        {/* Fixed at the arc's sides, whatever the title's length, above the covers. */}
        {count > 1 ? (
          <>
            <ArrowButton label="Previous" side="left" onClick={() => turn(-1)}>
              <ChevronLeft className="size-5" aria-hidden />
            </ArrowButton>
            <ArrowButton label="Next" side="right" onClick={() => turn(1)}>
              <ChevronRight className="size-5" aria-hidden />
            </ArrowButton>
          </>
        ) : null}
      </div>

      <div className="mt-1 flex flex-col items-center px-12 text-center" aria-live="polite">
        <p className="w-full truncate font-semibold text-text">{current.song.title}</p>
        <p className="w-full truncate text-sm text-muted">{current.song.artist}</p>
      </div>
    </section>
  );
}

type ArrowButtonProps = { label: string; side: 'left' | 'right'; onClick: () => void; children: ReactNode };

// Quiet round buttons over the faded side covers.
function ArrowButton({ label, side, onClick, children }: ArrowButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 z-[200] flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-muted transition active:scale-90 active:bg-brand-soft ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      {children}
    </button>
  );
}
