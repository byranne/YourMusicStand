import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef, useState } from 'react';

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

// The Cloudflare Turnstile check on the sign-in and sign-up forms. Without a
// site key (local development) there is no widget and no token is needed.
export function useCaptcha() {
  const widgetRef = useRef<TurnstileInstance>(null);
  const [token, setToken] = useState<string | null>(null);

  return {
    token: token ?? undefined,
    // False until the check has passed, so the form can hold its submit button.
    ready: !siteKey || token !== null,
    // A token works once: get a fresh one after every attempt.
    reset: () => {
      setToken(null);
      widgetRef.current?.reset();
    },
    widget: siteKey ? (
      <Turnstile
        ref={widgetRef}
        siteKey={siteKey}
        options={{ theme: 'auto', size: 'flexible' }}
        onSuccess={setToken}
        onExpire={() => setToken(null)}
        onError={() => setToken(null)}
      />
    ) : null,
  };
}
