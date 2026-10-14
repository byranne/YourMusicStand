import type { Tables } from './database.types';

export type Resource = Tables<'resources'>;

// Mirrors the file_size_limit on the 'resources' storage bucket.
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
// Mirrors the allowance in the bucket's upload policy: all of one account's files together.
export const MAX_TOTAL_FILE_BYTES = 50 * 1024 * 1024;

const MAX_LINK_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;

// A pasted link as a full web URL, or null if it isn't one. "songsterr.com/x"
// gets https:// in front; other schemes (javascript:, data:, mailto:) are refused
// because these are rendered as links.
export function normalizeLink(input: string): string | null {
  const text = input.trim();
  if (text === '' || /\s/.test(text)) return null;

  let candidate = text;
  if (!/^https?:\/\//i.test(text)) {
    // "example.com:8080" is a host and port, not a scheme.
    if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(text)) return null;
    candidate = `https://${text}`;
  }

  if (candidate.length > MAX_LINK_LENGTH || !URL.canParse(candidate)) return null;
  const url = new URL(candidate);
  if (!url.hostname.includes('.')) return null;
  return url.href.length > MAX_LINK_LENGTH ? null : url.href;
}

// What a link is called in the list: its site, e.g. "youtube.com".
export function linkTitle(url: string): string {
  return new URL(url).hostname.replace(/^www\./i, '').slice(0, MAX_TITLE_LENGTH);
}

export function fileTitle(fileName: string): string {
  return fileName.trim().slice(0, MAX_TITLE_LENGTH) || 'File';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// How much of the upload allowance a library's files take up. Links have no size.
export function usedFileBytes(entries: { resources: Pick<Resource, 'size_bytes'>[] }[]): number {
  return entries
    .flatMap((entry) => entry.resources)
    .reduce((total, resource) => total + (resource.size_bytes ?? 0), 0);
}

// The object name for an uploaded file. The first folder is the owner (the
// storage policies check it); the original name is kept only as an extension,
// so odd characters in file names never reach the path.
export function storagePathFor(userId: string, entryId: string, fileName: string, uniqueId: string): string {
  const extension = fileName.match(/\.([A-Za-z0-9]{1,8})$/)?.[1]?.toLowerCase();
  return `${userId}/${entryId}/${uniqueId}${extension ? `.${extension}` : ''}`;
}

export function sortResources(resources: Resource[]): Resource[] {
  return [...resources].sort((a, b) => a.created_at.localeCompare(b.created_at));
}
