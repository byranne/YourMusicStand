import { formatMinutes } from '@/lib/practice';
import { useLibrary } from '@/lib/queries';
import { bestStreak, totalMinutes, type PracticeSession } from '@/lib/stats';

// Everything since the first session, shown above the log; Home covers the current week.
export function AllTimeStats({ sessions }: { sessions: PracticeSession[] }) {
  const library = useLibrary();

  if (library.isPending) {
    return <div aria-label="Loading your stats" className="h-44 animate-pulse rounded-3xl bg-border" />;
  }

  const best = bestStreak(sessions);
  const learned = (library.data ?? []).filter((entry) => entry.status === 'learned').length;
  const tiles = [
    { label: 'Total time', value: formatMinutes(totalMinutes(sessions)) },
    { label: sessions.length === 1 ? 'Session' : 'Sessions', value: String(sessions.length) },
    { label: 'Best streak', value: `${best} ${best === 1 ? 'day' : 'days'}` },
    { label: learned === 1 ? 'Song learned' : 'Songs learned', value: String(learned) },
  ];

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">All time</h2>
      <dl className="grid grid-cols-2 gap-2">
        {tiles.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col-reverse items-center gap-0.5 rounded-2xl border border-border bg-surface px-2 py-4"
          >
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-xl font-bold whitespace-nowrap text-text tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
