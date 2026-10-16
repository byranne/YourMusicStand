import type { Resource } from '../resources';
import { supabase } from '../supabase';

// The only caller of Supabase Storage. The bucket is private: files are read
// through short-lived signed URLs, and storage policies keep each user inside
// their own top-level folder. Uploaded song covers and profile photos live in
// the same bucket.
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

// Song covers and profile photos: small JPEGs shrunk in the browser. Every
// upload gets a new path, so the file never changes and can be cached for a year.
export async function uploadCover(path: string, image: Blob): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, image, { contentType: 'image/jpeg', cacheControl: '31536000' });
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
// cover keeps its URL until it is half way to expiring. The URLs are kept in
// localStorage too, so after a relaunch the same URLs come out of the HTTP cache.
const COVER_URLS_KEY = 'musicstand.coverUrls';
type SignedCover = { url: string; renewAt: number };

function readCoverUrls(): Map<string, SignedCover> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(COVER_URLS_KEY) ?? '{}');
    const now = Date.now();
    return new Map(
      Object.entries(stored as Record<string, SignedCover>).filter(
        ([, cover]) => typeof cover?.url === 'string' && typeof cover.renewAt === 'number' && cover.renewAt > now,
      ),
    );
  } catch {
    return new Map();
  }
}

function saveCoverUrls(): void {
  try {
    localStorage.setItem(COVER_URLS_KEY, JSON.stringify(Object.fromEntries(coverUrls)));
  } catch {
    // Storage is full or blocked: covers are just signed again next launch.
  }
}

const coverUrls = readCoverUrls();

// On sign-out, so another account on this device doesn't inherit the links.
export function forgetCoverUrls(): void {
  coverUrls.clear();
  try {
    localStorage.removeItem(COVER_URLS_KEY);
  } catch {
    // Nothing stored to clear.
  }
}

// Signed URLs for cover paths, by path.
export async function signCovers(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const stale = paths.filter((path) => (coverUrls.get(path)?.renewAt ?? 0) <= now);
  if (stale.length > 0) {
    const signed = await signResourceFiles(stale, COVER_URL_SECONDS);
    const renewAt = now + (COVER_URL_SECONDS * 1000) / 2;
    for (const [path, url] of Object.entries(signed)) coverUrls.set(path, { url, renewAt });
    // Expired ones go, so the stored copy doesn't grow with every replaced cover.
    for (const [path, cover] of coverUrls) if (cover.renewAt <= now) coverUrls.delete(path);
    saveCoverUrls();
  }
  return Object.fromEntries(
    paths.flatMap((path) => {
      const cached = coverUrls.get(path);
      return cached ? [[path, cached.url]] : [];
    }),
  );
}
