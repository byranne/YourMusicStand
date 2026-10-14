import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

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

  return (
    <div>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={[
          'flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-opacity active:opacity-80',
          status ? statusColors[status] : 'bg-button text-on-button',
          disabled ? 'opacity-50' : '',
        ].join(' ')}
      >
        {status ? statusLabels[status] : 'Log'}
        <ChevronDown className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <ul role="menu" className="mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border">
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
    </div>
  );
}
