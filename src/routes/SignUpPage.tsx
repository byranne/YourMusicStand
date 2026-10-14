import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { AuthScreen } from '@/components/AuthScreen';
import { useCaptcha } from '@/components/Captcha';
import { Button, TextField } from '@/components/ui';
import { authErrorMessage } from '@/lib/authErrors';
import { useSignUp } from '@/lib/queries';
import { signUpFormSchema, type SignUpForm } from '@/lib/schemas/auth';

export function SignUpPage() {
  const signUp = useSignUp();
  const captcha = useCaptcha();
  const { register, handleSubmit, formState } = useForm<SignUpForm>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { email: '', password: '', confirm: '' },
  });

  const submit = handleSubmit(({ email, password }) =>
    signUp.mutate({ email, password, captchaToken: captcha.token }, { onSettled: captcha.reset }),
  );

  return (
    <AuthScreen footer={{ text: 'Already have an account?', label: 'Sign in', to: '/sign-in' }}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Password again"
          type="password"
          autoComplete="new-password"
          error={formState.errors.confirm?.message}
          {...register('confirm')}
        />
        {/* Nothing is emailed, so there is no reset link to fall back on. */}
        <p className="text-sm text-muted">Keep your password somewhere safe: it can't be reset by email.</p>
        {captcha.widget}
        {signUp.error ? <p className="text-sm text-danger">{authErrorMessage(signUp.error)}</p> : null}
        <Button type="submit" label="Create account" loading={signUp.isPending} disabled={!captcha.ready} />
      </form>
    </AuthScreen>
  );
}
