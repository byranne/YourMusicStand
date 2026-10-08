import type { ReactNode } from 'react';
import { Drawer } from 'vaul';

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Read by screen readers; the visible heading is up to the content.
  title: string;
  children: ReactNode;
};

// Bottom sheet: drag down or tap outside to close. Content scrolls inside, and
// the bottom padding clears the iOS home indicator.
export function Sheet({ open, onOpenChange, title, children }: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-scrim/50" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-md flex-col rounded-t-3xl border border-b-0 border-border bg-surface outline-none"
        >
          <div className="mx-auto mt-3 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden />
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <div className="overflow-y-auto px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
