import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email');
// Matches minimum_password_length in supabase/config.toml and the hosted
// project. 72 is where bcrypt stops reading, so Supabase refuses anything longer.
const newPassword = z.string().min(8, 'Use at least 8 characters').max(72, 'Use 72 characters or fewer');
const passwordsMatch = {
  path: ['confirm'],
  message: "Those passwords don't match",
};

export const signInFormSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});
export type SignInForm = z.infer<typeof signInFormSchema>;

export const signUpFormSchema = z
  .object({ email, password: newPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, passwordsMatch);
export type SignUpForm = z.infer<typeof signUpFormSchema>;

export const changePasswordFormSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, passwordsMatch);
export type ChangePasswordForm = z.infer<typeof changePasswordFormSchema>;
