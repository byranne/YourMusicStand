import { Pause } from 'lucide-react';
import { Link } from 'react-router';

import type { ActiveSession } from '@/lib/practice';

import { Equalizer } from './Equalizer';
import { useElapsed } from './useElapsed';

// A slim bar above the tab bar while a session runs, so it feels like one
// continuous session. Tapping it goes back to Home.
export function SessionBar({ session }: { session: ActiveSession }) {
  const clock = useElapsed(session);
  const paused = Boolean(session.pausedAt);

  return (
    <Link
      to="/"
      className="fixed inset-x-4 bottom-[calc(4.75rem+max(0.75rem,env(safe-area-inset-bottom)))] mx-auto flex h-11 max-w-md animate-rise items-center justify-between rounded-full bg-button px-4 text-on-button shadow-lg transition-transform active:scale-[0.98]"
    >
      <span className="flex items-center gap-2 font-medium">
        {paused ? <Pause className="size-5" aria-hidden /> : <Equalizer paused={false} />}
        {paused ? 'Paused' : 'Practicing'}
      </span>
      <span className="font-semibold tabular-nums">{clock}</span>
    </Link>
  );
}
