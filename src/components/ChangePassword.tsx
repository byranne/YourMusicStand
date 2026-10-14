import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, TextField } from '@/components/ui';
import { authErrorMessage } from '@/lib/authErrors';
import { useChangePassword } from '@/lib/queries';
import { changePasswordFormSchema, type ChangePasswordForm } from '@/lib/schemas/auth';

// In the Account sheet: one button that opens a short form for a new password.
export function ChangePassword() {
  const [editing, setEditing] = useState(false);
  const changePassword = useChangePassword();
  const { register, handleSubmit, formState, reset } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const close = () => {
    reset();
    setEditing(false);
  };
  const submit = handleSubmit(({ password }) => changePassword.mutate(password, { onSuccess: close }));

  if (!editing) {
    return (
      <>
        {changePassword.isSuccess ? <p className="text-sm text-text">Your password was changed.</p> : null}
        <Button
          label="Change password"
          variant="secondary"
          onClick={() => {
            changePassword.reset();
            setEditing(true);
          }}
        />
      </>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        error={formState.errors.password?.message}
        {...register('password')}
      />
      <TextField
        label="New password again"
        type="password"
        autoComplete="new-password"
        error={formState.errors.confirm?.message}
        {...register('confirm')}
      />
      {changePassword.error ? (
        <p className="text-sm text-danger">{authErrorMessage(changePassword.error)}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Button label="Cancel" variant="secondary" onClick={close} />
        <Button type="submit" label="Save" loading={changePassword.isPending} />
      </div>
    </form>
  );
}
