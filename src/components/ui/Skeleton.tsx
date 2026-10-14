import type { CSSProperties } from 'react';

import { staggerDelay } from '@/lib/motion';

// A loading placeholder with a light sweeping across it. Size and radius come from className.
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`relative overflow-hidden bg-border ${className}`}>
      <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-surface/60 to-transparent" />
    </div>
  );
}

// Inline style that delays the i-th item's entrance animation (`animate-rise`), so a list cascades in.
export function stagger(index: number): CSSProperties {
  return { animationDelay: `${staggerDelay(index)}ms` };
}
