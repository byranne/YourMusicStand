import { useEffect, useRef, useState } from 'react';

import { TextArea } from '@/components/ui';
import type { LibraryEntry } from '@/lib/library';
import { useUpdateEntry } from '@/lib/queries';
import { NOTES_MAX_LENGTH } from '@/lib/schemas/entry';

const SAVE_DELAY_MS = 800;

// One free-text note per song. Saves by itself: shortly after typing stops,
// when the field loses focus, and when the sheet closes.
export function SongNotes({ entry }: { entry: LibraryEntry }) {
  const { mutate, isPending, isError, isSuccess } = useUpdateEntry();
  const [text, setText] = useState(entry.notes ?? '');

  // What was last sent, so an unchanged note isn't saved twice.
  const sent = useRef<string | null>(entry.notes ?? '');
  const latest = useRef(text);

  const save = useRef((value: string) => {
    if (value === sent.current) return;
    sent.current = value;
    mutate(
      { id: entry.id, patch: { notes: value.trim() || null } },
      {
        onError: () => {
          sent.current = null;
        },
      },
    );
  });

  useEffect(() => {
    latest.current = text;
    const timer = setTimeout(() => save.current(text), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // Closing the sheet mid-sentence unmounts this before the timer fires.
  useEffect(() => {
    const flush = save.current;
    return () => flush(latest.current);
  }, []);

  let hint = null;
  if (isError) hint = <span className="text-danger">Couldn't save. Check your connection.</span>;
  else if (isPending) hint = 'Saving…';
  else if (isSuccess) hint = 'Saved';

  return (
    <div className="flex flex-col gap-2">
      <TextArea
        label="Notes"
        placeholder="Tuning, capo, the tricky bar…"
        rows={4}
        maxLength={NOTES_MAX_LENGTH}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => save.current(text)}
      />
      <p className="min-h-5 text-sm text-muted" aria-live="polite">
        {hint}
      </p>
    </div>
  );
}
