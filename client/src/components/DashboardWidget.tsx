import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus, RotateCcw } from 'lucide-react';

type WidgetType = 'number' | 'count' | 'list' | 'table' | 'chart' | 'link';

interface DashboardWidgetProps {
  title: string;
  icon?: ReactNode;
  type?: WidgetType;
  value?: string | number;
  trend?: {
    value: number;     // percent
    label: string;     // e.g. "к прошлой неделе"
  };
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}

export function DashboardWidget({
  title,
  icon,
  value,
  trend,
  loading = false,
  error = false,
  onRetry,
  onClick,
  children,
  className = '',
}: DashboardWidgetProps) {
  if (error) {
    return (
      <div
        className={[
          'min-w-[240px] min-h-[120px] p-5',
          'bg-[var(--color-bg-raised)] rounded-[var(--radius-xl)]',
          'border border-[var(--color-border-default)]',
          'flex flex-col items-center justify-center gap-2',
          className,
        ].join(' ')}
      >
        <p className="text-small text-[var(--color-error)]">Ошибка загрузки</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-small text-[var(--color-text-link)] hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            Обновить
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={[
          'min-w-[240px] min-h-[120px] p-5',
          'bg-[var(--color-bg-raised)] rounded-[var(--radius-xl)]',
          'border border-[var(--color-border-default)]',
          'space-y-3',
          className,
        ].join(' ')}
      >
        <div className="skeleton w-20 h-3" />
        <div className="skeleton w-[120px] h-7" />
        <div className="skeleton w-24 h-3" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={[
        'min-w-[240px] min-h-[120px] p-5',
        'bg-[var(--color-bg-raised)] rounded-[var(--radius-xl)]',
        'border border-[var(--color-border-default)]',
        onClick
          ? 'cursor-pointer hover:bg-[var(--color-bg-hover)] hover:shadow-[var(--shadow-sm)] transition-all duration-normal'
          : '',
        className,
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <span className="text-[var(--color-text-secondary)]">{icon}</span>
        )}
        <h3 className="text-small font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.05em]">
          {title}
        </h3>
      </div>

      {/* Value */}
      {value !== undefined && (
        <div className="text-h1 font-mono font-bold text-[var(--color-text-primary)] mb-2">
          {value}
        </div>
      )}

      {/* Trend */}
      {trend && (
        <div className="flex items-center gap-1.5">
          {trend.value > 0 ? (
            <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
          ) : trend.value < 0 ? (
            <TrendingDown className="h-4 w-4 text-[var(--color-error)]" />
          ) : (
            <Minus className="h-4 w-4 text-[var(--color-text-muted)]" />
          )}
          <span
            className={[
              'text-small',
              trend.value > 0
                ? 'text-[var(--color-success)]'
                : trend.value < 0
                  ? 'text-[var(--color-error)]'
                  : 'text-[var(--color-text-muted)]',
            ].join(' ')}
          >
            {trend.value > 0 ? '+' : ''}
            {trend.value}% {trend.label}
          </span>
        </div>
      )}

      {/* Custom content (chart, list, table) */}
      {children}

      {/* Link */}
      {onClick && (
        <div className="mt-3">
          <span className="text-small text-[var(--color-text-link)] hover:underline">
            Подробнее &rarr;
          </span>
        </div>
      )}
    </div>
  );
}
