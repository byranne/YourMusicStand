import { Music, Music2 } from 'lucide-react';
import type { CSSProperties } from 'react';

const NOTES = 10;
const DISTANCE = 56;

// Each note's direction, spin and look, spread evenly around a circle with a little wobble.
const notes = Array.from({ length: NOTES }, (_, i) => {
  const angle = (i / NOTES) * 2 * Math.PI + (i % 2 ? 0.2 : -0.15);
  const reach = DISTANCE * (i % 3 === 0 ? 1.2 : 1);
  return {
    dx: `${Math.round(Math.cos(angle) * reach)}px`,
    // Biased upward, so the burst reads as notes floating off.
    dy: `${Math.round(Math.sin(angle) * reach - 12)}px`,
    spin: `${i % 2 ? 25 : -25}deg`,
    Icon: i % 2 ? Music : Music2,
    tone: i % 3 === 0 ? 'text-button' : 'text-brand',
    delay: `${(i % 4) * 30}ms`,
  };
});

// A one-off burst of teal music notes from the middle of its parent, for celebrations.
// The parent needs `relative`; remount it (change its key) to play it again.
export function NoteBurst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {notes.map(({ dx, dy, spin, Icon, tone, delay }, i) => (
        <Icon
          key={i}
          className={`absolute size-4 animate-burst ${tone}`}
          style={{ '--dx': dx, '--dy': dy, '--spin': spin, animationDelay: delay } as CSSProperties}
        />
      ))}
    </span>
  );
}
