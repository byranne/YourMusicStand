import type { SongStatus } from '@/lib/database.types';

type ChipTone = SongStatus | 'selected' | 'neutral';

type ChipProps = {
  label: string;
  tone: ChipTone;
  // With onClick the chip is a button (a filter pill) with a full-height tap target.
  onClick?: () => void;
  pressed?: boolean;
};

// Fill + text pair for each status; shared with anything else that shows a status.
export const statusColors: Record<SongStatus, string> = {
  want_to_learn: 'bg-status-want text-on-status-want',
  learning: 'bg-status-learning text-on-status-learning',
  learned: 'bg-status-learned text-on-status-learned',
  shelved: 'bg-status-shelved text-on-status-shelved',
};

const tones: Record<ChipTone, string> = {
  ...statusColors,
  selected: 'bg-brand-soft text-on-brand-soft',
  neutral: 'border border-border bg-surface text-muted',
};

export function Chip({ label, tone, onClick, pressed }: ChipProps) {
  const base = `shrink-0 rounded-full font-medium whitespace-nowrap ${tones[tone]}`;

  if (!onClick) return <span className={`${base} px-2.5 py-1 text-xs`}>{label}</span>;

  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} className={`${base} h-11 px-4 text-sm`}>
      {label}
    </button>
  );
}
