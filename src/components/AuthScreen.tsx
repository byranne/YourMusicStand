import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/ui';

// True in an iPhone or iPad browser tab, false once the app runs from the home screen.
function isIosBrowserTab(): boolean {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone;
}

type AuthScreenProps = {
  // The form.
  children: ReactNode;
  // The way to the other page: "New here?" + "Create an account".
  footer: { text: string; label: string; to: string };
};

// What the sign-in and sign-up pages share: the mascot, the name and the link between them.
export function AuthScreen({ children, footer }: AuthScreenProps) {
  return (
    <Screen logo={false}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-16">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Mascot mood="happy" size={88} decorative />
          <h1 className="text-4xl font-extrabold text-text">
            Music<span className="text-brand">Stand</span>
          </h1>
          <p className="text-base text-muted">Track every song you learn.</p>
        </div>

        {children}

        <p className="mt-4 text-center text-base text-muted">
          {footer.text}{' '}
          <Link
            to={footer.to}
            className="inline-flex min-h-11 items-center font-semibold text-on-brand-soft underline underline-offset-2"
          >
            {footer.label}
          </Link>
        </p>

        {isIosBrowserTab() ? (
          // The home-screen app keeps its own storage, so a sign-in here doesn't carry over.
          <p className="mt-4 rounded-2xl border border-border bg-surface p-4 text-center text-sm text-muted">
            On iPhone, tap Share, then Add to Home Screen, and sign in from the app.
          </p>
        ) : null}
      </div>
    </Screen>
  );
}
