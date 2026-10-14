import type { ReactNode } from 'react';

type ScreenProps = {
  title?: string;
  // Shown opposite the title, e.g. the account button.
  action?: ReactNode;
  children?: ReactNode;
};

// Page wrapper: safe-area top padding (the PWA draws under the iOS status bar).
export function Screen({ title, action, children }: ScreenProps) {
  return (
    <div className="flex min-h-full flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
      {title ? (
        <div className="mb-4 flex min-h-11 items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-text">{title}</h1>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}
