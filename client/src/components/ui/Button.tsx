import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-primary-hover)] active:bg-[var(--color-accent-primary-active)]',
  secondary:
    'bg-[var(--color-bg-overlay)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:bg-[var(--color-bg-hover)]',
  danger:
    'bg-[var(--color-error)] text-white hover:opacity-90 active:opacity-80',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
  outline:
    'bg-transparent text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-muted)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-small gap-1.5',
  md: 'h-10 px-4 text-body-medium gap-2',
  lg: 'h-12 px-6 text-body-medium gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium',
          'rounded-[var(--radius-md)] transition-all duration-fast',
          'focus-visible:outline-2 focus-visible:outline-[var(--color-accent-primary)] focus-visible:outline-offset-2',
          'active:scale-[0.98]',
          variantStyles[variant],
          sizeStyles[size],
          isDisabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer',
          className,
        ].join(' ')}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && <span className="shrink-0">{icon}</span>}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
