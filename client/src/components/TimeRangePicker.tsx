import { Moon } from 'lucide-react';
import { Input } from './ui/Input';

interface TimeRangePickerProps {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  error?: string;
  disabled?: boolean;
}

/** Check if end < start (midnight crossing) */
function isMidnightCrossing(start: string, end: string): boolean {
  if (!start || !end) return false;
  return end < start;
}

/** Calculate duration string */
function calcDuration(start: string, end: string): string | null {
  if (!start || !end) return null;

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);

  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;

  if (endMins < startMins) {
    endMins += 24 * 60; // next day
  }

  const diff = endMins - startMins;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;

  if (mins === 0) return `${hours}\u0447`;
  return `${hours}\u0447 ${mins}\u043C\u0438\u043D`;
}

export function TimeRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startLabel = 'Начало',
  endLabel = 'Конец',
  error,
  disabled = false,
}: TimeRangePickerProps) {
  const crossing = isMidnightCrossing(startValue, endValue);
  const duration = calcDuration(startValue, endValue);

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-3">
        <div className="flex-1" style={{ maxWidth: 120 }}>
          <Input
            type="time"
            label={startLabel}
            value={startValue}
            onChange={(e) => onStartChange(e.target.value)}
            disabled={disabled}
            step={300}
          />
        </div>
        <span className="text-[var(--color-text-muted)] pb-2.5 select-none">
          &ndash;
        </span>
        <div className="flex-1" style={{ maxWidth: 120 }}>
          <Input
            type="time"
            label={endLabel}
            value={endValue}
            onChange={(e) => onEndChange(e.target.value)}
            disabled={disabled}
            step={300}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 min-h-[20px]">
        {duration && (
          <span className="text-small text-[var(--color-text-secondary)]">
            Длительность: {duration}
          </span>
        )}
        {crossing && (
          <span className="inline-flex items-center gap-1 text-small text-[var(--color-shift-night)]">
            <Moon className="h-3 w-3" />
            Через полночь
          </span>
        )}
      </div>

      {error && (
        <p className="text-small text-[var(--color-error)]">
          &#9888; {error}
        </p>
      )}
    </div>
  );
}
