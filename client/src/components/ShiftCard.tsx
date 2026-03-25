import { Lock, Pencil } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { OvertimeIndicator } from './OvertimeIndicator';
import { formatCurrency } from './CurrencyDisplay';
import type { Shift } from '@kinotabel/shared';

interface ShiftCardProps {
  shift: Shift;
  onClick?: () => void;
  className?: string;
}

/** Format date as Russian locale: "21 марта 2026, Пн" */
function formatDateRu(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'short',
  });
}

function getShiftStatus(shift: Shift): 'locked' | 'night' | 'pending' | 'confirmed' {
  if (shift.locked) return 'locked';
  if (shift.is_night) return 'night';
  return 'confirmed';
}

export function ShiftCard({ shift, onClick, className = '' }: ShiftCardProps) {
  const status = getShiftStatus(shift);
  const hasOvertime = shift.overtime_hours > 0;

  return (
    <div
      onClick={!shift.locked ? onClick : undefined}
      className={[
        'w-full min-h-[80px] p-4 rounded-[var(--radius-md)]',
        'bg-[var(--color-bg-raised)] border border-[var(--color-border-default)]',
        'transition-all duration-normal',
        shift.locked
          ? 'opacity-70'
          : 'hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)] active:scale-[0.99] cursor-pointer',
        shift.is_night ? 'border-l-[3px] border-l-[var(--color-shift-night)]' : '',
        hasOvertime && !shift.is_night ? 'border-l-[3px] border-l-[var(--color-shift-overtime)]' : '',
        className,
      ].join(' ')}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Top row: status + overtime */}
      <div className="flex items-center justify-between mb-2">
        <StatusBadge status={status} />
        {hasOvertime && (
          <OvertimeIndicator
            hours={shift.overtime_hours}
            amount={shift.overtime_amount}
          />
        )}
      </div>

      {/* Main content */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-body-medium text-[var(--color-text-primary)]">
            {formatDateRu(shift.date)}
          </div>
          <div className="font-mono text-body text-[var(--color-text-primary)]">
            {shift.shift_start} &ndash; {shift.shift_end}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-currency">
            {formatCurrency(shift.total_amount)}
          </div>
          {parseFloat(shift.total_with_fk) !== parseFloat(shift.total_amount) && (
            <div className="text-small text-[var(--color-text-secondary)] font-mono">
              + ФК {formatCurrency(shift.total_with_fk)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: address + lock/edit */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-small text-[var(--color-text-secondary)] truncate">
          {shift.address || '\u2014'}
        </span>
        {shift.locked ? (
          <Lock className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
        ) : (
          <Pencil className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
        )}
      </div>
    </div>
  );
}
