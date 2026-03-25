import { formatCurrency } from './CurrencyDisplay';

interface OvertimeIndicatorProps {
  hours: number;
  amount?: string;
  rate?: number;
  /** Display mode */
  mode?: 'inline' | 'block';
  className?: string;
}

type Severity = 'none' | 'low' | 'medium' | 'high' | 'critical';

function getSeverity(hours: number): Severity {
  if (hours <= 0) return 'none';
  if (hours <= 2) return 'low';
  if (hours <= 4) return 'medium';
  if (hours <= 6) return 'high';
  return 'critical';
}

const severityStyles: Record<Severity, { text: string; bg: string }> = {
  none: { text: 'var(--color-text-muted)', bg: 'transparent' },
  low: { text: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  medium: { text: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  high: { text: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  critical: { text: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

export function OvertimeIndicator({
  hours,
  amount,
  rate,
  mode = 'inline',
  className = '',
}: OvertimeIndicatorProps) {
  const severity = getSeverity(hours);

  if (severity === 'none') {
    return mode === 'block' ? (
      <div className={['text-small text-[var(--color-text-muted)]', className].join(' ')}>
        Без переработки
      </div>
    ) : null;
  }

  const style = severityStyles[severity];

  if (mode === 'inline') {
    return (
      <span
        className={[
          'inline-flex items-center gap-1 h-6 px-2 rounded-[var(--radius-sm)]',
          'font-mono text-small font-medium',
          className,
        ].join(' ')}
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        +{hours}\u0447
        {amount && <>&nbsp;&middot;&nbsp;{formatCurrency(amount)}</>}
      </span>
    );
  }

  // Block mode
  return (
    <div
      className={[
        'rounded-[var(--radius-sm)] p-2 space-y-1',
        className,
      ].join(' ')}
      style={{ backgroundColor: style.bg }}
    >
      <div className="flex justify-between">
        <span className="text-small text-[var(--color-text-secondary)]">
          Переработка:
        </span>
        <span
          className="font-mono text-small font-medium"
          style={{ color: style.text }}
        >
          {hours} \u0447
        </span>
      </div>
      {amount && (
        <div className="flex justify-between">
          <span className="text-small text-[var(--color-text-secondary)]">
            Сумма:
          </span>
          <span className="font-mono text-small font-medium text-[var(--color-text-primary)]">
            {formatCurrency(amount)}
          </span>
        </div>
      )}
      {rate && (
        <div className="flex justify-between">
          <span className="text-small text-[var(--color-text-secondary)]">
            Ставка:
          </span>
          <span className="font-mono text-small text-[var(--color-text-muted)]">
            {formatCurrency(rate)}/\u0447
          </span>
        </div>
      )}
    </div>
  );
}
