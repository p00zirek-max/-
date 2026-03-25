import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const paddingMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  children,
  padding = 'md',
  hoverable = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'bg-[var(--color-bg-raised)] rounded-[var(--radius-md)]',
        'border border-[var(--color-border-default)]',
        paddingMap[padding],
        hoverable
          ? 'cursor-pointer hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)] active:scale-[0.99] transition-all duration-fast'
          : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
