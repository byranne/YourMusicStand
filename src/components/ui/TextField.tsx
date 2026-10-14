import { useId, type ComponentProps } from 'react';

type TextFieldProps = Omit<ComponentProps<'input'>, 'className'> & {
  label?: string;
  error?: string;
};

// Works with react-hook-form's register() (React 19 passes ref as a prop).
// Inputs stay at text-base (16px) so iOS Safari doesn't zoom on focus.
export function TextField({ label, error, id, ...inputProps }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-muted">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={!!error}
        className={[
          'h-12 min-w-0 rounded-xl border bg-surface px-4 text-base text-text outline-none placeholder:text-muted',
          error ? 'border-danger' : 'border-border focus:border-brand',
        ].join(' ')}
        {...inputProps}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
