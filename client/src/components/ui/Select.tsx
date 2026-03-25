import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  icon?: ReactNode;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  error,
  required,
  disabled,
  searchable = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = searchable && search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="flex flex-col gap-[var(--space-xs)]" ref={containerRef}>
      {label && (
        <label className="text-body-medium text-[var(--color-text-secondary)]">
          {label}
          {required && (
            <span className="text-[var(--color-error)] ml-0.5">*</span>
          )}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className={[
            'w-full h-10 px-3 rounded-[var(--radius-md)] text-left',
            'flex items-center justify-between gap-2',
            'transition-all duration-fast',
            open
              ? 'bg-[var(--color-bg-overlay)] border-2 border-[var(--color-border-focus)]'
              : error
                ? 'bg-[var(--color-bg-input)] border-2 border-[var(--color-border-error)]'
                : 'bg-[var(--color-bg-input)] border border-[var(--color-border-default)] hover:border-[var(--color-text-muted)]',
            disabled
              ? 'opacity-50 pointer-events-none'
              : 'cursor-pointer',
          ].join(' ')}
        >
          <span
            className={
              selectedOption
                ? 'text-[var(--color-text-primary)] truncate'
                : 'text-[var(--color-text-muted)] truncate'
            }
          >
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={[
              'h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-fast',
              open ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {open && (
          <div
            className={[
              'absolute z-[var(--z-dropdown)] w-full mt-1',
              'bg-[var(--color-bg-overlay)] border border-[var(--color-border-default)]',
              'rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]',
              'max-h-[300px] overflow-auto',
            ].join(' ')}
          >
            {searchable && (
              <div className="sticky top-0 p-2 bg-[var(--color-bg-overlay)]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск..."
                    autoFocus
                    className={[
                      'w-full h-8 pl-8 pr-3 rounded-[var(--radius-md)]',
                      'bg-[var(--color-bg-input)] text-[var(--color-text-primary)]',
                      'border border-[var(--color-border-default)]',
                      'text-small placeholder:text-[var(--color-text-muted)]',
                      'focus:outline-none focus:border-[var(--color-border-focus)]',
                    ].join(' ')}
                  />
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-small text-[var(--color-text-muted)]">
                Ничего не найдено
              </div>
            )}

            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch('');
                }}
                className={[
                  'w-full px-3 py-2.5 text-left text-body',
                  'hover:bg-[var(--color-bg-hover)] transition-colors duration-fast',
                  option.value === value
                    ? 'bg-[var(--color-bg-selected)] text-[var(--color-accent-primary)]'
                    : 'text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-small text-[var(--color-error)]">
          <span>&#9888;</span> {error}
        </p>
      )}
    </div>
  );
}
