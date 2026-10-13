import { ChevronRight } from 'lucide-react';

import { Chip, CoverArt } from '@/components/ui';
import type { SongStatus } from '@/lib/database.types';
import { statusLabels } from '@/lib/library';

type SongRowProps = {
  title: string;
  artist: string;
  coverUrl: string | null;
  // Set when the song is in the user's library.
  status?: SongStatus;
  // Shown instead of the status, e.g. the time spent on the song.
  detail?: string;
  onClick: () => void;
};

export function SongRow({ title, artist, coverUrl, status, detail, onClick }: SongRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left active:opacity-80"
    >
      <CoverArt url={coverUrl} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-text">{title}</span>
        <span className="truncate text-sm text-muted">{artist}</span>
      </span>
      {detail ? (
        <span className="shrink-0 text-sm font-semibold text-text tabular-nums">{detail}</span>
      ) : status ? (
        <Chip label={statusLabels[status]} tone={status} />
      ) : (
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
      )}
    </button>
  );
}
