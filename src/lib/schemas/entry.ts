import { z } from 'zod';

import type { TablesUpdate } from '../database.types';

// Mirrors the column checks on songs.title / songs.artist.
export const customSongSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title').max(300, 'Keep the title under 300 characters'),
  artist: z.string().trim().min(1, 'Enter an artist').max(300, 'Keep the artist under 300 characters'),
});

// Only web links: these are rendered as links, so no javascript: or data: URLs.
const optionalLink = z
  .string()
  .trim()
  .max(2000, 'That link is too long')
  .refine((value) => value === '' || (/^https?:\/\//i.test(value) && URL.canParse(value)), {
    message: 'Enter a full link starting with https://',
  });

// The optional details on a library entry. Mirrors the column checks on user_songs.
// Text fields are '' when empty (form inputs); entryDetailsToPatch() stores them as null.
export const entryDetailsSchema = z.object({
  progress: z.number().int().min(0).max(100),
  difficulty: z.number().int().min(1).max(5).nullable(),
  tuning: z.string().trim().max(40, 'Keep the tuning under 40 characters'),
  capo: z
    .number('Capo is a fret from 0 to 12')
    .int('Capo is a fret from 0 to 12')
    .min(0, 'Capo is a fret from 0 to 12')
    .max(12, 'Capo is a fret from 0 to 12')
    .nullable(),
  tab_url: optionalLink,
  video_url: optionalLink,
  notes: z.string().max(5000, 'Keep notes under 5000 characters'),
});
export type EntryDetails = z.infer<typeof entryDetailsSchema>;

export function entryDetailsToPatch(details: EntryDetails): TablesUpdate<'user_songs'> {
  return {
    progress: details.progress,
    difficulty: details.difficulty,
    tuning: details.tuning || null,
    capo: details.capo,
    tab_url: details.tab_url || null,
    video_url: details.video_url || null,
    notes: details.notes.trim() || null,
  };
}
