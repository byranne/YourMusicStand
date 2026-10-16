import { useState } from 'react';

import { AppearanceSettings, GoalSettings, ProfileSettings } from '@/components/AccountSettings';
import { ChangePassword } from '@/components/ChangePassword';
import { Avatar, Button, Sheet } from '@/components/ui';
import { useProfile, useSession, useSignOut } from '@/lib/queries';

// The header button on every tab, showing the profile picture. It opens a sheet
// to personalize the app (picture, name, theme, background, weekly goal), change
// the password and sign out.
export function AccountButton() {
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const profile = useProfile();
  const signOut = useSignOut();

  return (
    <>
      <button
        type="button"
        aria-label="Account"
        onClick={() => setOpen(true)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface transition active:scale-95"
      >
        <Avatar
          photoUrl={profile.data?.avatar_photo_url}
          preset={profile.data?.avatar_preset}
          name={profile.data?.display_name}
          email={session?.user.email}
          size={42}
        />
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Account">
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-text">Account</h2>
          <ProfileSettings />
          <AppearanceSettings />
          <GoalSettings />
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Sign-in</h3>
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
          </section>
        </div>
      </Sheet>
    </>
  );
}
