import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { Button, TextArea, TextField } from '@/components/ui';
import type { LibraryEntry } from '@/lib/library';
import { useUpdateEntry } from '@/lib/queries';
import { entryDetailsSchema, entryDetailsToPatch, type EntryDetails } from '@/lib/schemas/entry';

const difficulties = [1, 2, 3, 4, 5];

// The optional details of a library entry. Nothing here is needed to log a song.
export function EntryDetailsForm({ entry }: { entry: LibraryEntry }) {
  const updateEntry = useUpdateEntry();

  const saved = useMemo<EntryDetails>(
    () => ({
      progress: entry.progress,
      difficulty: entry.difficulty,
      tuning: entry.tuning ?? '',
      capo: entry.capo,
      tab_url: entry.tab_url ?? '',
      video_url: entry.video_url ?? '',
      notes: entry.notes ?? '',
    }),
    [entry.progress, entry.difficulty, entry.tuning, entry.capo, entry.tab_url, entry.video_url, entry.notes],
  );

  // `values` keeps the form in step with the entry (a status change to Learned
  // sets progress to 100) without discarding fields the user is still editing.
  const { register, handleSubmit, formState, watch, setValue } = useForm<EntryDetails>({
    resolver: zodResolver(entryDetailsSchema),
    values: saved,
    resetOptions: { keepDirtyValues: true },
  });
  const { errors } = formState;
  const progress = watch('progress');
  const difficulty = watch('difficulty');

  const submit = handleSubmit((details) =>
    updateEntry.mutate({ id: entry.id, patch: entryDetailsToPatch(details) }),
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="entry-progress" className="flex justify-between text-sm font-medium text-muted">
          Progress <span className="text-text">{progress}%</span>
        </label>
        <input
          id="entry-progress"
          type="range"
          min={0}
          max={100}
          step={5}
          className="h-11 w-full accent-brand"
          {...register('progress', { valueAsNumber: true })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span id="entry-difficulty" className="text-sm font-medium text-muted">
          Difficulty
        </span>
        <div role="group" aria-labelledby="entry-difficulty" className="flex gap-2">
          {difficulties.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={difficulty === level}
              onClick={() =>
                setValue('difficulty', difficulty === level ? null : level, { shouldDirty: true })
              }
              className={[
                'size-11 rounded-full text-base font-medium',
                difficulty === level
                  ? 'bg-brand-soft text-on-brand-soft'
                  : 'border border-border bg-surface text-muted',
              ].join(' ')}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Tuning"
          placeholder="Standard"
          autoCapitalize="none"
          autoCorrect="off"
          error={errors.tuning?.message}
          {...register('tuning')}
        />
        <TextField
          label="Capo"
          placeholder="None"
          inputMode="numeric"
          error={errors.capo?.message}
          {...register('capo', {
            setValueAs: (value: string | number | null) =>
              value === '' || value === null ? null : Number(value),
          })}
        />
      </div>

      <TextField
        label="Tab link"
        type="url"
        placeholder="https://"
        autoCapitalize="none"
        autoCorrect="off"
        error={errors.tab_url?.message}
        {...register('tab_url')}
      />
      <TextField
        label="Video link"
        type="url"
        placeholder="https://"
        autoCapitalize="none"
        autoCorrect="off"
        error={errors.video_url?.message}
        {...register('video_url')}
      />
      <TextArea label="Notes" error={errors.notes?.message} {...register('notes')} />

      {updateEntry.error ? (
        <p className="text-sm text-danger">Couldn't save. Check your connection and try again.</p>
      ) : null}
      <Button
        type="submit"
        label={formState.isDirty ? 'Save details' : 'Saved'}
        disabled={!formState.isDirty}
        loading={updateEntry.isPending}
      />
    </form>
  );
}
