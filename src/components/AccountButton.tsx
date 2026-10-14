import { User } from 'lucide-react';
import { useState } from 'react';

import { ChangePassword } from '@/components/ChangePassword';
import { Button, Sheet } from '@/components/ui';
import { useSession, useSignOut } from '@/lib/queries';

// The header button on every tab: opens a sheet with who is signed in, a way to
// change the password and the way to sign out.
export function AccountButton() {
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const signOut = useSignOut();

  return (
    <>
      <button
        type="button"
        aria-label="Account"
        onClick={() => setOpen(true)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted"
      >
        <User className="size-5" aria-hidden />
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Account">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-text">Account</h2>
          <p className="text-sm text-muted">
            Signed in as <span className="text-text">{session?.user.email}</span>
          </p>
          <ChangePassword />
          {signOut.error ? <p className="text-sm text-danger">{signOut.error.message}</p> : null}
          <Button
            label="Sign out"
            variant="ghost"
            onClick={() => signOut.mutate()}
            loading={signOut.isPending}
          />
        </div>
      </Sheet>
    </>
  );
}
