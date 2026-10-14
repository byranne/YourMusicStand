import type { ReactNode } from 'react';

import { Mascot } from '@/components/Mascot';

type ScreenProps = {
  title?: string;
  // Shown opposite the title, e.g. the account button.
  action?: ReactNode;
  // Off on the sign-in pages, which show the mascot full size instead.
  logo?: boolean;
  children?: ReactNode;
};

// Page wrapper: safe-area top padding (the PWA draws under the iOS status bar).
// The header carries the app's mascot as its logo mark.
export function Screen({ title, action, logo = true, children }: ScreenProps) {
  return (
    <div className="flex min-h-full flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="mb-4 flex min-h-11 items-center gap-3">
        {logo ? <Mascot mood="idle" size={32} decorative still /> : null}
        {title ? <h1 className="min-w-0 flex-1 text-3xl font-bold text-text">{title}</h1> : <div className="flex-1" />}
        {action}
      </div>
      {children}
    </div>
  );
}
