// Which cover images the browser already has, remembered for as long as the
// app is open, so a cover that comes back on screen (a refreshed search, a
// reopened sheet, another tab) neither fades in again nor retries an image
// that isn't there. Browser-only.

const loaded = new Set<string>();
const failed = new Set<string>();
const loading = new Set<string>();
// Preloaded images are kept, so the browser keeps them decoded and a cover
// element that mounts later (one sliding into the cover arc) paints at once.
const kept = new Map<string, HTMLImageElement>();

export function coverLoaded(url: string): boolean {
  return loaded.has(url);
}

export function coverFailed(url: string): boolean {
  return failed.has(url);
}

export function markCover(url: string, ok: boolean): void {
  loading.delete(url);
  (ok ? loaded : failed).add(url);
}

// Fetches and decodes covers ahead of time, so the library's art is ready
// before its rows are on screen. Each URL is tried once.
export function preloadCovers(urls: Iterable<string | null>): void {
  for (const url of urls) {
    if (!url || loaded.has(url) || failed.has(url) || loading.has(url)) continue;
    loading.add(url);
    const image = new Image();
    image.decoding = 'async';
    // Must match CoverArt's <img>, or the browser fetches the cover twice.
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      markCover(url, true);
      kept.set(url, image);
    };
    image.onerror = () => markCover(url, false);
    image.src = url;
  }
}

// Covers of the songs, jamlists and profile you have, kept on the device so a
// relaunch shows them at once. The service worker only reads this cache (see
// vite.config.ts); covers are put in and taken out here, so search results
// never land in it.
const COVER_CACHE = 'covers';
// Covers that answered with an error (no art), not retried this launch.
const uncacheable = new Set<string>();
const caching = new Set<string>();

// The key a cover is kept under. A signed Storage link loses its token, so a
// re-signed link still matches; every upload gets a new path. The service
// worker strips it the same way.
export function coverCacheKey(url: string): string {
  const parsed = new URL(url);
  if (parsed.pathname.includes('/storage/v1/object/sign/')) parsed.search = '';
  return parsed.href;
}

// Adds the covers that aren't kept yet and, with `prune`, drops the ones no
// longer wanted (a removed song, a replaced photo). Best effort: a cover that
// can't be kept is just fetched normally.
export async function keepCovers(urls: Iterable<string | null>, { prune }: { prune: boolean }): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const wanted = new Map<string, string>();
    for (const url of urls) if (url) wanted.set(coverCacheKey(url), url);
    const cache = await caches.open(COVER_CACHE);
    const stored = new Set((await cache.keys()).map((request) => request.url));
    if (prune) await Promise.all([...stored].filter((key) => !wanted.has(key)).map((key) => cache.delete(key)));
    await Promise.all(
      [...wanted]
        .filter(([key]) => !stored.has(key) && !uncacheable.has(key) && !caching.has(key))
        .map(async ([key, url]) => {
          caching.add(key);
          try {
            const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (response.ok) await cache.put(key, response);
            else uncacheable.add(key);
          } catch {
            // Offline or blocked: tried again next time.
          } finally {
            caching.delete(key);
          }
        }),
    );
  } catch {
    // Cache Storage unavailable (private mode, quota).
  }
}

// On sign-out, so the next account on this device starts without these covers.
export async function forgetCovers(): Promise<void> {
  if (typeof caches === 'undefined') return;
  await caches.delete(COVER_CACHE).catch(() => false);
}
