import type { Resource } from '../resources';
import { supabase } from '../supabase';

// The only caller of Supabase Storage. The bucket is private: files are read
// through short-lived signed URLs, and storage policies keep each user inside
// their own top-level folder.
const BUCKET = 'resources';
export const SIGNED_URL_SECONDS = 60 * 60;

export async function uploadResourceFile(path: string, file: File): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream' });
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
export async function signResourceFiles(paths: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;
  return Object.fromEntries(
    data.flatMap((signed) => (signed.path && signed.signedUrl ? [[signed.path, signed.signedUrl]] : [])),
  );
}
