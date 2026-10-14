import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { AuthScreen } from '@/components/AuthScreen';
import { useCaptcha } from '@/components/Captcha';
import { Button, TextField } from '@/components/ui';
import { authErrorMessage } from '@/lib/authErrors';
import { useSignIn } from '@/lib/queries';
import { signInFormSchema, type SignInForm } from '@/lib/schemas/auth';

export function SignInPage() {
  const signIn = useSignIn();
  const captcha = useCaptcha();
  const { register, handleSubmit, formState } = useForm<SignInForm>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit((values) =>
    signIn.mutate({ ...values, captchaToken: captcha.token }, { onSettled: captcha.reset }),
  );

  return (
    <AuthScreen footer={{ text: 'New here?', label: 'Create an account', to: '/sign-up' }}>
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
          autoComplete="current-password"
          error={formState.errors.password?.message}
          {...register('password')}
        />
        {captcha.widget}
        {signIn.error ? <p className="text-sm text-danger">{authErrorMessage(signIn.error)}</p> : null}
        <Button type="submit" label="Sign in" loading={signIn.isPending} disabled={!captcha.ready} />
      </form>
    </AuthScreen>
  );
}
