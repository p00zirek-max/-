import type { ReactNode } from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'accent';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  /** Custom background color */
  bgColor?: string;
  /** Custom text color */
  textColor?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-[var(--color-bg-overlay)] text-[var(--color-text-secondary)]',
  success:
    'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  warning:
    'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  error:
    'bg-[var(--color-error-muted)] text-[var(--color-error)]',
  info:
    'bg-[var(--color-info-muted)] text-[var(--color-info)]',
  accent:
    'bg-[var(--color-accent-primary-muted)] text-[var(--color-accent-primary)]',
};

export function Badge({
  variant = 'default',
  children,
  className = '',
  bgColor,
  textColor,
}: BadgeProps) {
  const customStyle = bgColor || textColor
    ? { backgroundColor: bgColor, color: textColor }
    : undefined;

  return (
    <span
      className={[
        'inline-flex items-center h-[22px] px-2',
        'rounded-[var(--radius-sm)] text-small font-medium',
        !customStyle ? variantStyles[variant] : '',
        className,
      ].join(' ')}
      style={customStyle}
    >
      {children}
    </span>
  );
}
