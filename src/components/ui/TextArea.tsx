import { useId, type ComponentProps } from 'react';

type TextAreaProps = Omit<ComponentProps<'textarea'>, 'className'> & {
  label?: string;
  error?: string;
};

// Multi-line counterpart of TextField: same look, works with register(), and
// stays at text-base so iOS Safari doesn't zoom on focus.
export function TextArea({ label, error, id, rows = 3, ...textareaProps }: TextAreaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label htmlFor={textareaId} className="text-sm font-medium text-muted">
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={!!error}
        className={[
          'rounded-xl border bg-surface px-4 py-3 text-base text-text outline-none placeholder:text-muted',
          error ? 'border-danger' : 'border-border focus:border-brand',
        ].join(' ')}
        {...textareaProps}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
