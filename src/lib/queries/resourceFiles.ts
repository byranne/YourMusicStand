import type { Resource } from '../resources';
import { supabase } from '../supabase';

// The only caller of Supabase Storage. The bucket is private: files are read
// through short-lived signed URLs, and storage policies keep each user inside
// their own top-level folder. Uploaded song covers live in the same bucket.
const BUCKET = 'resources';
export const SIGNED_URL_SECONDS = 60 * 60;
// Covers show up everywhere and change rarely, so they get longer-lived URLs.
const COVER_URL_SECONDS = 7 * 24 * 60 * 60;

export async function uploadResourceFile(path: string, file: File): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream' });
  if (error) throw error;
}

export async function uploadCover(path: string, image: Blob): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, image, { contentType: 'image/jpeg' });
  if (error) throw error;
}

// Best effort: by now the rows that pointed at these files are gone, so a
// failure here only leaves an unreachable file behind.
export async function removeResourceFiles(resources: Pick<Resource, 'storage_path'>[]): Promise<void> {
  const paths = resources.flatMap((resource) => (resource.storage_path ? [resource.storage_path] : []));
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

// Signed URLs by storage path.
export async function signResourceFiles(
  paths: string[],
  seconds = SIGNED_URL_SECONDS,
): Promise<Record<string, string>> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, seconds);
  if (error) throw error;
  return Object.fromEntries(
    data.flatMap((signed) => (signed.path && signed.signedUrl ? [[signed.path, signed.signedUrl]] : [])),
  );
}

// Each signing makes a new URL, which the browser would download again, so a
// cover keeps its URL until it is half way to expiring.
const coverUrls = new Map<string, { url: string; renewAt: number }>();

// Signed URLs for cover paths, by path.
export async function signCovers(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const stale = paths.filter((path) => (coverUrls.get(path)?.renewAt ?? 0) <= now);
  if (stale.length > 0) {
    const signed = await signResourceFiles(stale, COVER_URL_SECONDS);
    const renewAt = now + (COVER_URL_SECONDS * 1000) / 2;
    for (const [path, url] of Object.entries(signed)) coverUrls.set(path, { url, renewAt });
  }
  return Object.fromEntries(paths.flatMap((path) => {
    const cached = coverUrls.get(path);
    return cached ? [[path, cached.url]] : [];
  }));
}
