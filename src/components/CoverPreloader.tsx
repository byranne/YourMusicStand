import { useEffect } from 'react';

import { keepCovers, preloadCovers } from '@/lib/coverImages';
import { useJamlists, useLibrary, useProfile } from '@/lib/queries';

// Keeps the covers of everything you've saved (library songs, jamlists, your
// photo) on the device, then warms them, so lists and sheets show their art
// straight away instead of fading it in row by row, even after a relaunch.
export function CoverPreloader() {
  const entries = useLibrary().data;
  const jamlists = useJamlists().data;
  const profile = useProfile().data;

  useEffect(() => {
    if (!entries) return;
    const urls = [
      ...entries.map((entry) => entry.song.cover_url),
      ...(jamlists ?? []).map((jamlist) => jamlist.cover_url),
      profile?.avatar_photo_url ?? null,
    ];
    // Covers that are no longer wanted go only once all three have loaded, so
    // a slow query doesn't drop covers that are still in use.
    const prune = jamlists !== undefined && profile !== undefined;
    void keepCovers(urls, { prune }).finally(() => preloadCovers(urls));
  }, [entries, jamlists, profile]);

  return null;
}
