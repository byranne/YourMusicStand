import { z } from 'zod';

import { normalizeLink } from '../resources';

// Mirrors the column checks on songs.title / songs.artist.
export const customSongSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title').max(300, 'Keep the title under 300 characters'),
  artist: z.string().trim().min(1, 'Enter an artist').max(300, 'Keep the artist under 300 characters'),
});

// Mirrors the column check on user_songs.notes.
export const NOTES_MAX_LENGTH = 5000;

// A pasted link for a resource. normalizeLink() accepts a missing https:// and
// refuses anything that isn't a web link.
export const resourceLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Paste a link')
    .refine((value) => normalizeLink(value) !== null, { message: "That doesn't look like a web link" }),
});
export type ResourceLink = z.infer<typeof resourceLinkSchema>;
