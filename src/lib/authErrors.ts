// Plain sentences for what Supabase Auth returns, keyed by its error code.
const messages: Record<string, string> = {
  invalid_credentials: "That email and password don't match.",
  user_already_exists: 'There is already an account with that email. Sign in instead.',
  email_exists: 'There is already an account with that email. Sign in instead.',
  email_address_invalid: 'Enter a valid email.',
  weak_password: 'Choose a longer password, at least 8 characters.',
  same_password: 'That is already your password.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
  captcha_failed: "The human check didn't pass. Try again.",
  signup_disabled: 'New accounts are closed right now.',
};

const OFFLINE = "Couldn't reach MusicStand. Check your connection and try again.";
const UNKNOWN = 'Something went wrong. Try again.';

// What to show for a failed sign-in, sign-up or password change. Takes
// `unknown` because it is fed whatever a mutation threw.
export function authErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return UNKNOWN;
  const { code, name, message } = error as { code?: unknown; name?: unknown; message?: unknown };

  if (typeof code === 'string' && messages[code]) return messages[code];
  // The request never got an answer: Supabase's own error, or the browser's
  // ("Failed to fetch" in Chrome, "Load failed" in Safari).
  if (name === 'AuthRetryableFetchError') return OFFLINE;
  if (typeof message !== 'string' || message.trim() === '') return UNKNOWN;
  if (/failed to fetch|load failed|networkerror/i.test(message)) return OFFLINE;
  return message;
}
