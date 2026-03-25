import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, required, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-[var(--space-xs)]">
        {label && (
          <label
            htmlFor={inputId}
            className="text-body-medium text-[var(--color-text-secondary)]"
          >
            {label}
            {required && (
              <span className="text-[var(--color-error)] ml-0.5">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'h-10 px-3 rounded-[var(--radius-md)]',
            'bg-[var(--color-bg-input)] text-[var(--color-text-primary)]',
            'border transition-all duration-fast',
            'placeholder:text-[var(--color-text-muted)]',
            'focus:outline-none',
            error
              ? 'border-[var(--color-border-error)] border-2'
              : 'border-[var(--color-border-default)] hover:border-[var(--color-text-muted)] focus:border-[var(--color-border-focus)] focus:border-2 focus:shadow-[var(--shadow-glow)]',
            'disabled:bg-[var(--color-bg-base)] disabled:text-[var(--color-text-disabled)] disabled:border-[var(--color-border-subtle)]',
            'read-only:bg-transparent read-only:border-dashed read-only:border-[var(--color-border-subtle)] read-only:text-[var(--color-text-secondary)]',
            props.type === 'time' || props.type === 'number'
              ? 'font-mono'
              : '',
            className,
          ].join(' ')}
          {...props}
        />
        {error && (
          <p className="text-small text-[var(--color-error)] flex items-center gap-1 animate-[slideDown_150ms_ease-out]">
            <span>&#9888;</span> {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-small text-[var(--color-text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
