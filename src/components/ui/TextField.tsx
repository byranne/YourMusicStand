import { Eye, EyeOff } from 'lucide-react';
import { useId, useState, type ComponentProps } from 'react';

type TextFieldProps = Omit<ComponentProps<'input'>, 'className'> & {
  label?: string;
  error?: string;
};

// Works with react-hook-form's register() (React 19 passes ref as a prop).
// Inputs stay at text-base (16px) so iOS Safari doesn't zoom on focus.
// A password field gets a button to show what was typed.
export function TextField({ label, error, id, type, ...inputProps }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-muted">
          {label}
        </label>
      ) : null}
      <div className="relative flex min-w-0">
        <input
          id={inputId}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={!!error}
          className={[
            'h-12 w-full min-w-0 rounded-xl border bg-surface px-4 text-base text-text outline-none placeholder:text-muted',
            isPassword ? 'pr-12' : '',
            error ? 'border-danger' : 'border-border focus:border-brand',
          ].join(' ')}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            onClick={() => setRevealed(!revealed)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-xl text-muted active:opacity-80"
          >
            {revealed ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
