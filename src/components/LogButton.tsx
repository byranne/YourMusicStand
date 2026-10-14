import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { NoteBurst } from '@/components/NoteBurst';
import { statusColors } from '@/components/ui';
import type { SongStatus } from '@/lib/database.types';
import { allStatuses, logStatuses, statusLabels } from '@/lib/library';

type LogButtonProps = {
  // The entry's current status, or null when the song isn't in the library yet.
  status: SongStatus | null;
  disabled?: boolean;
  onPick: (status: SongStatus) => void;
};

// "Log" opens the status choices right below it. Once a song is logged the
// button shows its status, and the same menu changes it (and can shelve it).
export function LogButton({ status, disabled = false, onPick }: LogButtonProps) {
  const [open, setOpen] = useState(false);
  const options = status ? allStatuses : logStatuses;
  // Counts changes to Learned, so each one plays the note burst afresh.
  const [previous, setPrevious] = useState(status);
  const [learnedCount, setLearnedCount] = useState(0);
  if (status !== previous) {
    setPrevious(status);
    if (status === 'learned') setLearnedCount((count) => count + 1);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={[
          'flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition active:scale-[0.97] active:opacity-80',
          status ? statusColors[status] : 'bg-button text-on-button',
          disabled ? 'opacity-50' : '',
        ].join(' ')}
      >
        {/* Keyed by the status, so a change pops in. */}
        <span key={status ?? 'none'} className={status ? 'animate-pop' : ''}>
          {status ? statusLabels[status] : 'Log'}
        </span>
        <ChevronDown className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <ul role="menu" className="mt-2 animate-rise divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {options.map((option) => (
            <li key={option} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={option === status}
                onClick={() => {
                  setOpen(false);
                  if (option !== status) onPick(option);
                }}
                className="flex h-12 w-full items-center justify-between px-4 text-left text-base text-text active:bg-brand-soft"
              >
                {statusLabels[option]}
                {option === status ? <Check className="size-5 text-brand" aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {/* Drawn last so the notes fly over the button. */}
      {learnedCount > 0 ? <NoteBurst key={learnedCount} /> : null}
    </div>
  );
}
