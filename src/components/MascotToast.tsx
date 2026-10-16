import { useMascotReaction } from '@/lib/mascotEvents';

import { Mascot } from './Mascot';
import { NoteBurst } from './NoteBurst';
import { StreakFlame } from './StreakFlame';

// A short reaction bubble above the tab bar, on whichever tab you're on.
export function MascotToast() {
  const reaction = useMascotReaction();
  if (!reaction) return null;

  return (
    <div
      key={reaction.id}
      role="status"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+max(0.75rem,env(safe-area-inset-bottom)))] z-40 mx-auto flex max-w-md animate-pop items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-lg"
    >
      <span className="relative shrink-0">
        <Mascot mood={reaction.mood} size={44} />
        {/* Big moments get a burst of notes off the mascot. */}
        {reaction.mood === 'celebrate' ? <NoteBurst /> : null}
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium text-text">{reaction.text}</p>
      {reaction.event === 'streakUp' ? <StreakFlame count={1} size={20} /> : null}
    </div>
  );
}
