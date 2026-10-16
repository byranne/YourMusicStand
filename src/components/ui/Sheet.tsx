import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Drawer } from 'vaul';

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Read by screen readers; the visible heading is up to the content.
  title: string;
  // Opened from inside another sheet, which stays underneath.
  nested?: boolean;
  children: ReactNode;
};

// Bottom sheet: drag down, tap outside or tap the X to close. Content scrolls inside, and
// the bottom padding clears the iOS home indicator.
export function Sheet({ open, onOpenChange, title, nested = false, children }: SheetProps) {
  const Root = nested ? Drawer.NestedRoot : Drawer.Root;
  return (
    <Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-scrim/50" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-md flex-col rounded-t-3xl border border-b-0 border-border bg-surface outline-none"
        >
          <div className="relative h-12 shrink-0">
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-border" aria-hidden />
            <Drawer.Close
              aria-label="Close"
              className="absolute top-1 right-2 flex size-11 items-center justify-center rounded-full text-muted active:opacity-80"
            >
              <X className="size-5" aria-hidden />
            </Drawer.Close>
          </div>
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <div className="overflow-y-auto px-5 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Root>
  );
}
