import { Music } from 'lucide-react';
import { useState } from 'react';

import { coverFailed, coverLoaded, markCover } from '@/lib/coverImages';

type CoverArtProps = {
  url: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  // Load and decode straight away rather than when scrolled near, for covers
  // that move into view without scrolling (the cover arc).
  eager?: boolean;
};

const sizes = {
  xs: { box: 'size-8 rounded-lg', icon: 'size-4' },
  sm: { box: 'size-12 rounded-xl', icon: 'size-5' },
  md: { box: 'size-16 rounded-xl', icon: 'size-6' },
  lg: { box: 'size-28 rounded-2xl', icon: 'size-10' },
  xl: { box: 'size-44 rounded-3xl', icon: 'size-14' },
};

// Album cover over a placeholder. The placeholder is always there, so a song
// without a cover (custom songs, and catalog songs the Cover Art Archive has no
// image for, which 404) never changes, and one with a cover fades in over it.
export function CoverArt({ url, size = 'sm', eager = false }: CoverArtProps) {
  // coverImages holds the answer; this only re-renders when an image settles.
  const [, setSettled] = useState(0);
  const { box, icon } = sizes[size];

  const settle = (settled: string, ok: boolean) => {
    markCover(settled, ok);
    setSettled((count) => count + 1);
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-brand-soft text-on-brand-soft ${box}`}
    >
      <Music className={icon} aria-hidden />
      {url && !coverFailed(url) ? (
        <img
          key={url}
          src={url}
          alt=""
          // Matches preloadCovers, so both share one cached response.
          crossOrigin="anonymous"
          // A cover already in the cache can finish before React attaches
          // onLoad; show it straight away instead of fading it in.
          ref={(image) => {
            if (image?.complete && image.naturalWidth > 0 && !coverLoaded(url)) settle(url, true);
          }}
          loading={eager ? 'eager' : 'lazy'}
          decoding={eager ? 'sync' : 'async'}
          onLoad={() => settle(url, true)}
          onError={() => settle(url, false)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${
            coverLoaded(url) ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : null}
    </div>
  );
}
