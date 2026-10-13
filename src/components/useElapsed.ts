import { useEffect, useState } from 'react';

import { formatClock, playedMs, type ActiveSession } from '@/lib/practice';

// The running clock text for a session, ticking once a second. It is derived
// from timestamps each tick, so it's right after the phone sleeps. A paused
// session holds its time and doesn't tick.
export function useElapsed(session: ActiveSession): string {
  const [now, setNow] = useState(() => Date.now());
  const paused = Boolean(session.pausedAt);

  useEffect(() => {
    if (paused) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return formatClock(playedMs(session, new Date(now)));
}
