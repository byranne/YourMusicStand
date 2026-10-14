import { Plus } from 'lucide-react';

import { CoverArt, stagger } from '@/components/ui';
import { jamlistCover, jamlistEntries, songCountLabel, type Jamlist } from '@/lib/jamlists';
import type { LibraryEntry } from '@/lib/library';

type JamlistTilesProps = {
  jamlists: Jamlist[];
  library: LibraryEntry[];
  onOpen: (jamlist: Jamlist) => void;
  onNew: () => void;
};

// A sideways row of jamlists under the Cover Flow, ending in a "New" tile.
export function JamlistTiles({ jamlists, library, onOpen, onNew }: JamlistTilesProps) {
  return (
    <section className="mb-6" aria-label="Jamlists">
      <h2 className="mb-2 text-lg font-bold text-text">Jamlists</h2>
      {/* Bleeds to the screen edges so the tiles scroll under the page padding. */}
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 [scrollbar-width:none]">
        {jamlists.map((jamlist, index) => {
          const entries = jamlistEntries(jamlist, library);
          return (
            <button
              key={jamlist.id}
              type="button"
              onClick={() => onOpen(jamlist)}
              style={stagger(index)}
              className="flex w-28 shrink-0 animate-rise flex-col gap-1.5 text-left transition-transform active:scale-[0.97]"
            >
              <CoverArt url={jamlistCover(jamlist, entries)} size="lg" />
              <span className="flex flex-col">
                <span className="truncate text-sm font-semibold text-text">{jamlist.name}</span>
                <span className="truncate text-xs text-muted">{songCountLabel(entries.length)}</span>
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onNew}
          className="flex w-28 shrink-0 flex-col gap-1.5 text-left transition-transform active:scale-[0.97]"
        >
          <span className="flex size-28 items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted">
            <Plus className="size-8" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-muted">New jamlist</span>
        </button>
      </div>
    </section>
  );
}
