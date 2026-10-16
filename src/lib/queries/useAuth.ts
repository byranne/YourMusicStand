import { useMutation } from '@tanstack/react-query';

import { forgetCovers } from '../coverImages';
import { supabase } from '../supabase';
import { applyBackground } from '../theme';
import { forgetCoverUrls } from './resourceFiles';

// The captcha token is only there when the build has a Turnstile site key;
// the hosted project requires it, the local stack doesn't.
type Credentials = { email: string; password: string; captchaToken?: string | undefined };

// On success the auth listener sets the session and the router leaves /sign-in.
export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password, captchaToken }: Credentials) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
      if (error) throw error;
    },
  });
}

// Anyone can make an account. Nothing is emailed: with confirmation off,
// signing up signs the new user in straight away, like useSignIn.
export function useSignUp() {
  return useMutation({
    mutationFn: async ({ email, password, captchaToken }: Credentials) => {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { captchaToken } });
      if (error) throw error;
      // Only happens if email confirmation gets switched on in the project.
      if (!data.session) throw new Error("Your account was created, but it can't be signed in to yet.");
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    // The page background, the signed cover links and the kept covers belong
    // to the account, so the next one starts plain and fills its own.
    onSuccess: () => {
      applyBackground('plain');
      forgetCoverUrls();
      void forgetCovers();
    },
  });
}
