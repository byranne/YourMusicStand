import { useEffect, useRef, useState } from 'react';

import { countUpValue } from '@/lib/motion';

const DURATION_MS = 700;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The number to show while it counts from 0 (or its last value) up to `target`.
// With reduced motion it shows the target straight away.
export function useCountUp(target: number): number {
  const [shown, setShown] = useState(() => (reducedMotion() ? target : 0));
  const from = useRef(shown);

  useEffect(() => {
    if (reducedMotion()) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = requestAnimationFrame(function step(now) {
      const t = (now - start) / DURATION_MS;
      const value = countUpValue(origin, target, t);
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return shown;
}
