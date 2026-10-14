import type { CSSProperties } from 'react';

// Sways from its base rather than the SVG's corner.
const base = '[transform-box:fill-box] origin-bottom';

const OUTER =
  'M16 2C18 9 27 14 27 25C27 33 22 38 16 38C10 38 5 33 5 25C5 18 10 15 11 9C13 12 14 14 15 16C16 11 15 6 16 2Z';
const CORE = 'M16 18C18 22 22 25 22 30C22 34 19 37 16 37C13 37 10 34 10 30C10 26 13 24 16 18Z';

// Where each ember starts and which way it drifts as it rises.
const embers = [
  { cx: 12, cy: 12, drift: '-4px', delay: '0s' },
  { cx: 20, cy: 14, drift: '5px', delay: '0.6s' },
  { cx: 16, cy: 6, drift: '1px', delay: '1.2s' },
];

// More embers the longer the streak runs.
function emberCount(streak: number): number {
  if (streak >= 7) return 3;
  if (streak >= 3) return 2;
  return 1;
}

// The streak flame: flickering with a glow and rising embers while lit, a cold outline at 0.
export function StreakFlame({ count, size = 24 }: { count: number; size?: number }) {
  const lit = count > 0;

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: (size * 40) / 32 }} aria-hidden>
      {lit ? <span className="absolute inset-x-0 bottom-0 aspect-square animate-glow rounded-full bg-streak/30 blur-md" /> : null}
      <svg viewBox="0 0 32 40" className="relative size-full overflow-visible">
        {lit ? (
          <>
            {embers.slice(0, emberCount(count)).map((ember) => (
              <circle
                key={ember.delay}
                cx={ember.cx}
                cy={ember.cy}
                r="1.6"
                className="animate-ember fill-streak"
                style={{ '--drift': ember.drift, animationDelay: ember.delay } as CSSProperties}
              />
            ))}
            <path d={OUTER} className={`fill-streak ${base} animate-flicker`} />
            <path d={CORE} className={`fill-streak-core ${base} animate-flicker-fast`} />
          </>
        ) : (
          <path d={OUTER} className="fill-border stroke-muted" strokeWidth="2" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  );
}
