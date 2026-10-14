import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';

type ButtonProps = Omit<ComponentProps<'button'>, 'children' | 'className'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
};

const variantClasses = {
  primary: 'bg-button font-semibold text-on-button',
  secondary: 'border border-border bg-surface font-medium text-text',
  ghost: 'bg-transparent font-medium text-muted',
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  ...buttonProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        'flex h-12 w-full items-center justify-center rounded-xl px-6 text-base transition active:scale-[0.97] active:opacity-80',
        variantClasses[variant],
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
      {...buttonProps}
    >
      {loading ? <LoaderCircle aria-label="Loading" className="size-5 animate-spin" /> : label}
    </button>
  );
}
