import { useEffect, useState } from 'react';

import { Button, Sheet } from '@/components/ui';
import { useActiveSession } from '@/lib/activeSession';
import { isProbablyAbandoned } from '@/lib/practice';

import { SessionRecap } from './SessionRecap';

const KEEP_ALIVE_MS = 60_000;

// Keeps lastSeenAt fresh while the app is open, and asks "Still playing?" when
// the app comes back after hours away (a forgotten Stop). Mounted once, in the
// tab layout.
export function SessionWatcher() {
  const { session, peek, seen, discard } = useActiveSession();
  const running = session !== null;
  const [asking, setAsking] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!running) return;

    // peek(), not `session`: these handlers run long after this render, and
    // lastSeenAt has moved on since.
    const check = () => {
      const current = peek();
      if (!current || document.visibilityState === 'hidden') return;
      if (isProbablyAbandoned(current, new Date())) setAsking(true);
      else seen();
    };

    // Leaving the app records when you were last here; coming back checks the gap.
    // While the question is up, lastSeenAt is left alone: it's the time to finish at.
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') check();
      else if (!asking) seen();
    };

    check();
    const timer = window.setInterval(() => {
      if (!asking) check();
    }, KEEP_ALIVE_MS);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [running, asking, peek, seen]);

  if (!session) return null;

  // This component outlives the session, so its own state has to be reset too.
  const end = () => {
    discard();
    setFinishing(false);
    setAsking(false);
  };

  if (finishing) {
    return (
      <SessionRecap
        kind="finish"
        session={session}
        endAt={new Date(session.lastSeenAt)}
        onClose={() => setFinishing(false)}
        onSaved={end}
        onDiscard={end}
      />
    );
  }

  return (
    <Sheet
      open={asking}
      onOpenChange={(open) => {
        // Dismissing is the same as "Still going"; it never ends the session.
        if (!open) {
          seen();
          setAsking(false);
        }
      }}
      title="Still practicing?"
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-text">Still practicing?</h2>
        <p className="text-muted">Your session has been running since you last had the app open.</p>
        <Button
          label="Still going"
          onClick={() => {
            seen();
            setAsking(false);
          }}
        />
        <Button label="Finish it" variant="secondary" onClick={() => setFinishing(true)} />
      </div>
    </Sheet>
  );
}
