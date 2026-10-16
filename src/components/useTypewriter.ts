import { useEffect, useState } from 'react';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// How many characters of `text` to show, counting up like dialogue being spoken.
// It starts over whenever the text changes, and shows it all at once for reduced motion.
export function useTypewriter(text: string, msPerChar = 30): number {
  const [typed, setTyped] = useState({ text: '', count: 0 });
  const [instant] = useState(reducedMotion);

  useEffect(() => {
    if (instant || !text) return;
    const start = performance.now();
    const timer = window.setInterval(() => {
      const count = Math.min(text.length, Math.floor((performance.now() - start) / msPerChar) + 1);
      setTyped({ text, count });
      if (count >= text.length) window.clearInterval(timer);
    }, msPerChar);
    return () => window.clearInterval(timer);
  }, [text, msPerChar, instant]);

  if (instant) return text.length;
  return typed.text === text ? typed.count : 0;
}
