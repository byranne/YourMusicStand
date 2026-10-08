import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button, Screen } from '@/components/ui';
import { useSession, useSignOut } from '@/lib/queries';

export function ProfilePage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const signOut = useSignOut();

  return (
    <Screen>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-2 flex h-11 items-center gap-1 self-start text-muted"
      >
        <ChevronLeft className="size-5" aria-hidden />
        Back
      </button>
      <h1 className="mb-4 text-3xl font-bold text-text">Profile</h1>
      <div className="mt-auto flex flex-col gap-3 pb-6">
        <p className="text-sm text-muted">
          Signed in as <span className="text-text">{session?.user.email}</span>
        </p>
        {signOut.error ? <p className="text-sm text-danger">{signOut.error.message}</p> : null}
        <Button
          label="Sign out"
          variant="ghost"
          onClick={() => signOut.mutate()}
          loading={signOut.isPending}
        />
      </div>
    </Screen>
  );
}
