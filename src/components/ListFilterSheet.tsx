import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, Chip, Sheet } from '@/components/ui';
import type { SongStatus } from '@/lib/database.types';
import type { Jamlist } from '@/lib/jamlists';
import { allStatuses, statusLabels } from '@/lib/library';
import { activeFilterCount, DEFAULT_FILTER, sortLabels, type ListFilter, type ListSort } from '@/lib/listView';

const sorts: ListSort[] = ['recent', 'title', 'artist'];

// The button next to My List's search field. A count shows how many filters are on.
export function FilterButton({ filter, onClick }: { filter: ListFilter; onClick: () => void }) {
  const active = activeFilterCount(filter);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active > 0 ? `Filters, ${active} on` : 'Filters'}
      className={`relative flex size-12 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 ${
        active > 0 ? 'border-transparent bg-brand-soft text-on-brand-soft' : 'border-border bg-surface text-muted'
      }`}
    >
      <SlidersHorizontal className="size-5" aria-hidden />
      {active > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-button text-xs font-semibold text-on-button">
          {active}
        </span>
      ) : null}
    </button>
  );
}

type ListFilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: ListFilter;
  onChange: (filter: ListFilter) => void;
  flat: boolean;
  onFlatChange: (flat: boolean) => void;
  counts: Record<SongStatus, number>;
  total: number;
  jamlists: Jamlist[];
};

export function ListFilterSheet({
  open,
  onOpenChange,
  filter,
  onChange,
  flat,
  onFlatChange,
  counts,
  total,
  jamlists,
}: ListFilterSheetProps) {
  const set = (patch: Partial<ListFilter>) => onChange({ ...filter, ...patch });

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Filter your list">
      <div className="flex flex-col gap-5">
        <h2 className="text-xl font-bold text-text">Filter</h2>

        <Group label="Status">
          <Chip
            label={`All ${total}`}
            tone={filter.status === null ? 'selected' : 'neutral'}
            pressed={filter.status === null}
            onClick={() => set({ status: null })}
          />
          {allStatuses.map((status) => (
            <Chip
              key={status}
              label={`${statusLabels[status]} ${counts[status]}`}
              tone={filter.status === status ? 'selected' : 'neutral'}
              pressed={filter.status === status}
              onClick={() => set({ status: filter.status === status ? null : status })}
            />
          ))}
        </Group>

        {jamlists.length > 0 ? (
          <Group label="Jamlist">
            {jamlists.map((jamlist) => (
              <Chip
                key={jamlist.id}
                label={jamlist.name}
                tone={filter.jamlistId === jamlist.id ? 'selected' : 'neutral'}
                pressed={filter.jamlistId === jamlist.id}
                onClick={() => set({ jamlistId: filter.jamlistId === jamlist.id ? null : jamlist.id })}
              />
            ))}
          </Group>
        ) : null}

        <Group label="Sort by">
          {sorts.map((sort) => (
            <Chip
              key={sort}
              label={sortLabels[sort]}
              tone={filter.sort === sort ? 'selected' : 'neutral'}
              pressed={filter.sort === sort}
              onClick={() => set({ sort })}
            />
          ))}
        </Group>

        <Group label="Show">
          <Chip
            label="Covers and sections"
            tone={!flat ? 'selected' : 'neutral'}
            pressed={!flat}
            onClick={() => onFlatChange(false)}
          />
          <Chip label="Flat list" tone={flat ? 'selected' : 'neutral'} pressed={flat} onClick={() => onFlatChange(true)} />
        </Group>

        <div className="flex gap-3">
          <Button
            label="Clear"
            variant="secondary"
            disabled={activeFilterCount(filter) === 0}
            onClick={() => onChange({ ...DEFAULT_FILTER, sort: filter.sort })}
          />
          <Button label="Done" onClick={() => onOpenChange(false)} />
        </div>
      </div>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
