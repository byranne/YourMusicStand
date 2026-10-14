import { Music } from 'lucide-react';
import { useState } from 'react';

type CoverArtProps = {
  url: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

const sizes = {
  xs: { box: 'size-8 rounded-lg', icon: 'size-4' },
  sm: { box: 'size-12 rounded-xl', icon: 'size-5' },
  md: { box: 'size-16 rounded-xl', icon: 'size-6' },
  lg: { box: 'size-28 rounded-2xl', icon: 'size-10' },
};

// Remembered for as long as the app is open, so a cover that comes back on
// screen (a refreshed search, a reopened sheet) neither fades in again nor
// retries an image that isn't there.
const loaded = new Set<string>();
const failed = new Set<string>();

// Album cover over a placeholder. The placeholder is always there, so a song
// without a cover (custom songs, and catalog songs the Cover Art Archive has no
// image for, which 404) never changes, and one with a cover fades in over it.
export function CoverArt({ url, size = 'sm' }: CoverArtProps) {
  // The sets above hold the answer; this only re-renders when an image settles.
  const [, setSettled] = useState(0);
  const { box, icon } = sizes[size];

  const settle = (urls: Set<string>, settled: string) => {
    urls.add(settled);
    setSettled((count) => count + 1);
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-brand-soft text-on-brand-soft ${box}`}
    >
      <Music className={icon} aria-hidden />
      {url && !failed.has(url) ? (
        <img
          key={url}
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => settle(loaded, url)}
          onError={() => settle(failed, url)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${
            loaded.has(url) ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : null}
    </div>
  );
}
