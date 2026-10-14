import { Skeleton, stagger } from '@/components/ui';
import { formatMinutes } from '@/lib/practice';
import { useLibrary } from '@/lib/queries';
import { bestStreak, totalMinutes, type PracticeSession } from '@/lib/stats';

import { useCountUp } from './useCountUp';

// Everything since the first session, shown above the log; Home covers the current week.
export function AllTimeStats({ sessions }: { sessions: PracticeSession[] }) {
  const library = useLibrary();

  if (library.isPending) {
    return <Skeleton className="h-44 rounded-3xl" />;
  }

  const best = bestStreak(sessions);
  const learned = (library.data ?? []).filter((entry) => entry.status === 'learned').length;
  const tiles = [
    { label: 'Total time', value: totalMinutes(sessions), format: formatMinutes },
    { label: sessions.length === 1 ? 'Session' : 'Sessions', value: sessions.length, format: String },
    { label: 'Best streak', value: best, format: (days: number) => `${days} ${best === 1 ? 'day' : 'days'}` },
    { label: learned === 1 ? 'Song learned' : 'Songs learned', value: learned, format: String },
  ];

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">All time</h2>
      <dl className="grid grid-cols-2 gap-2">
        {tiles.map((tile, index) => (
          <Tile key={tile.label} index={index} {...tile} />
        ))}
      </dl>
    </section>
  );
}

type TileProps = { label: string; value: number; format: (value: number) => string; index: number };

// One stat, counting up to its value as it appears.
function Tile({ label, value, format, index }: TileProps) {
  const shown = useCountUp(value);

  return (
    <div
      style={stagger(index)}
      className="flex animate-rise flex-col-reverse items-center gap-0.5 rounded-2xl border border-border bg-surface px-2 py-4"
    >
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-xl font-bold whitespace-nowrap text-text tabular-nums">
        <span className="sr-only">{format(value)}</span>
        <span aria-hidden>{format(shown)}</span>
      </dd>
    </div>
  );
}
