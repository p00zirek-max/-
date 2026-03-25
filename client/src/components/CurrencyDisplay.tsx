interface CurrencyDisplayProps {
  /** Amount as decimal string from server */
  amount: string | number;
  /** Show FK% breakdown */
  withFk?: {
    totalWithFk: string;
    fkPercent: number;
  };
  /** Variant */
  variant?: 'simple' | 'withFk' | 'breakdown';
  /** Breakdown data */
  breakdown?: {
    shiftAmount: string;
    overtimeAmount: string;
    overtimeHours?: number;
    overtimeRate?: number;
    kmAmount: string;
    kmTotal?: number;
    kmRate?: number;
    unitAmount: string;
    unitCount?: number;
    unitRate?: number;
    total: string;
    totalWithFk: string;
    fkPercent: number;
  };
  /** Color variant */
  color?: 'default' | 'positive' | 'negative' | 'muted';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  loading?: boolean;
  className?: string;
}

/** Format number with thousands separator and ruble sign */
export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 \u20BD';

  const hasDecimals = num % 1 !== 0;
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  const sign = num < 0 ? '\u2212' : '';
  return `${sign}${formatted} \u20BD`;
}

const colorStyles = {
  default: 'text-[var(--color-text-primary)]',
  positive: 'text-[var(--color-success)]',
  negative: 'text-[var(--color-error)]',
  muted: 'text-[var(--color-text-muted)]',
};

const sizeStyles = {
  sm: 'text-small',
  md: 'text-currency',
  lg: 'text-h2 font-bold',
};

export function CurrencyDisplay({
  amount,
  withFk,
  variant = 'simple',
  breakdown,
  color = 'default',
  size = 'md',
  loading = false,
  className = '',
}: CurrencyDisplayProps) {
  if (loading) {
    return <div className="skeleton w-[60px] h-[18px]" />;
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const effectiveColor = num === 0 ? 'muted' : color;

  if (variant === 'breakdown' && breakdown) {
    return (
      <div className={['text-right font-mono tabular-nums', className].join(' ')}>
        <div className="space-y-1">
          <Row label="Смена" value={breakdown.shiftAmount} />
          <Row
            label="Переработка"
            value={breakdown.overtimeAmount}
            detail={
              breakdown.overtimeHours && breakdown.overtimeRate
                ? `${breakdown.overtimeHours}\u0447 \u00D7 ${formatCurrency(breakdown.overtimeRate)}`
                : undefined
            }
          />
          <Row
            label="Перепробег"
            value={breakdown.kmAmount}
            detail={
              breakdown.kmTotal && breakdown.kmRate
                ? `${breakdown.kmTotal}\u043A\u043C \u00D7 ${formatCurrency(breakdown.kmRate)}`
                : undefined
            }
          />
          <Row
            label="Штучные"
            value={breakdown.unitAmount}
            detail={
              breakdown.unitCount && breakdown.unitRate
                ? `${breakdown.unitCount}\u0448\u0442 \u00D7 ${formatCurrency(breakdown.unitRate)}`
                : undefined
            }
          />
        </div>
        <div className="border-t border-[var(--color-border-default)] mt-2 pt-2">
          <Row label="Итого" value={breakdown.total} bold />
          <Row
            label={`С ФК (${breakdown.fkPercent}%)`}
            value={breakdown.totalWithFk}
            bold
          />
        </div>
      </div>
    );
  }

  return (
    <div className={['text-right', className].join(' ')}>
      <span
        className={[
          'font-mono tabular-nums font-semibold',
          sizeStyles[size],
          colorStyles[effectiveColor],
        ].join(' ')}
      >
        {formatCurrency(amount)}
      </span>
      {variant === 'withFk' && withFk && (
        <div className="text-small text-[var(--color-text-secondary)] font-mono tabular-nums">
          с ФК: {formatCurrency(withFk.totalWithFk)} ({withFk.fkPercent}%)
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  detail,
  bold,
}: {
  label: string;
  value: string;
  detail?: string;
  bold?: boolean;
}) {
  const num = parseFloat(value);
  if (num === 0 && !bold) return null;

  return (
    <div className="flex justify-between gap-4">
      <span className={['text-small text-[var(--color-text-secondary)]', bold ? 'font-semibold' : ''].join(' ')}>
        {label}:
      </span>
      <div className="text-right">
        <span className={['text-small text-[var(--color-text-primary)]', bold ? 'font-semibold' : ''].join(' ')}>
          {formatCurrency(value)}
        </span>
        {detail && (
          <span className="text-xs text-[var(--color-text-muted)] ml-1">
            ({detail})
          </span>
        )}
      </div>
    </div>
  );
}
