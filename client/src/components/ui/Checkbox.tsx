import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, checked, className = '', ...props }, ref) => {
    return (
      <label
        className={[
          'inline-flex items-center gap-2 cursor-pointer select-none',
          'min-h-[44px] lg:min-h-0',
          props.disabled ? 'opacity-50 pointer-events-none' : '',
          className,
        ].join(' ')}
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div
            className={[
              'w-5 h-5 lg:w-[18px] lg:h-[18px] rounded-[var(--radius-sm)]',
              'border-2 transition-all duration-fast',
              'flex items-center justify-center',
              'peer-checked:bg-[var(--color-accent-primary)] peer-checked:border-[var(--color-accent-primary)]',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-accent-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-bg-base)]',
              checked
                ? 'bg-[var(--color-accent-primary)] border-[var(--color-accent-primary)]'
                : 'bg-[var(--color-bg-input)] border-[var(--color-border-default)]',
            ].join(' ')}
          >
            {checked && (
              <Check className="h-3.5 w-3.5 text-[var(--color-text-inverse)]" />
            )}
          </div>
        </div>
        {label && (
          <span className="text-body text-[var(--color-text-primary)]">
            {label}
          </span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
