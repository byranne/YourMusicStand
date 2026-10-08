import { Music } from 'lucide-react';
import { useState } from 'react';

type CoverArtProps = {
  url: string | null;
  size?: 'sm' | 'lg';
};

const sizes = {
  sm: { box: 'size-12 rounded-xl', icon: 'size-5' },
  lg: { box: 'size-28 rounded-2xl', icon: 'size-10' },
};

// Album cover with a placeholder for songs that have none (custom songs, and
// catalog songs the Cover Art Archive has no image for, which 404).
export function CoverArt({ url, size = 'sm' }: CoverArtProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const { box, icon } = sizes[size];

  if (!url || failedUrl === url) {
    return (
      <div className={`flex shrink-0 items-center justify-center bg-brand-soft text-on-brand-soft ${box}`}>
        <Music className={icon} aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailedUrl(url)}
      className={`shrink-0 bg-brand-soft object-cover ${box}`}
    />
  );
}
