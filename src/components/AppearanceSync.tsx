import { useEffect } from 'react';

import { useSettings } from '@/lib/queries';
import { applyBackground } from '@/lib/theme';

// Applies the account's page background once settings load (and whenever they
// change). index.html paints the cached copy before that.
export function AppearanceSync() {
  const background = useSettings().data?.background;

  useEffect(() => {
    if (background) applyBackground(background);
  }, [background]);

  return null;
}
