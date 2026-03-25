import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check, Filter } from 'lucide-react';
import { Button } from './ui/Button';

interface FilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const isActive = selected.length > 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={[
          'h-10 px-3 rounded-[var(--radius-md)] text-body',
          'flex items-center gap-2 transition-all duration-fast',
          'border',
          isActive
            ? 'bg-[var(--color-accent-primary-muted)] text-[var(--color-accent-primary)] border-[var(--color-accent-primary)]'
            : 'bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]',
          open
            ? 'bg-[var(--color-bg-overlay)] border-[var(--color-border-focus)]'
            : '',
        ].join(' ')}
      >
        {label}
        {isActive && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)] text-xs font-medium">
            {selected.length}
          </span>
        )}
        <ChevronDown className={['h-4 w-4 transition-transform', open ? 'rotate-180' : ''].join(' ')} />
      </button>

      {open && (
        <div className="absolute z-[var(--z-dropdown)] top-full mt-1 w-64 bg-[var(--color-bg-overlay)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-[var(--color-border-subtle)]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              autoFocus
              className="w-full h-8 px-2 rounded-[var(--radius-md)] bg-[var(--color-bg-input)] text-small text-[var(--color-text-primary)] border border-[var(--color-border-default)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focus)]"
            />
          </div>

          {/* Select/deselect all */}
          <div className="flex gap-2 px-2 py-1.5 border-b border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="text-xs text-[var(--color-text-link)] hover:underline"
            >
              Выбрать все
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-[var(--color-text-link)] hover:underline"
            >
              Снять все
            </button>
          </div>

          {/* Options */}
          <div className="max-h-[300px] overflow-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-small text-[var(--color-text-muted)]">
                Ничего не найдено
              </div>
            )}
            {filtered.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className={[
                    'w-full px-3 py-2 text-left text-body flex items-center gap-2',
                    'hover:bg-[var(--color-bg-hover)] transition-colors',
                    isSelected ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'w-4 h-4 rounded-[var(--radius-sm)] border flex items-center justify-center shrink-0',
                      isSelected
                        ? 'bg-[var(--color-accent-primary)] border-[var(--color-accent-primary)]'
                        : 'border-[var(--color-border-default)]',
                    ].join(' ')}
                  >
                    {isSelected && <Check className="h-3 w-3 text-[var(--color-text-inverse)]" />}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface DateRangeFilterProps {
  dateFrom: string | null;
  dateTo: string | null;
  onChange: (from: string | null, to: string | null) => void;
}

function DateRangeFilter({ dateFrom, dateTo, onChange }: DateRangeFilterProps) {
  const isActive = !!(dateFrom || dateTo);

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={dateFrom || ''}
        onChange={(e) => onChange(e.target.value || null, dateTo)}
        className={[
          'h-10 px-2 rounded-[var(--radius-md)] text-body font-mono',
          'border transition-all duration-fast',
          isActive
            ? 'bg-[var(--color-accent-primary-muted)] text-[var(--color-accent-primary)] border-[var(--color-accent-primary)]'
            : 'bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]',
          'focus:outline-none focus:border-[var(--color-border-focus)]',
        ].join(' ')}
      />
      <span className="text-[var(--color-text-muted)]">&ndash;</span>
      <input
        type="date"
        value={dateTo || ''}
        onChange={(e) => onChange(dateFrom, e.target.value || null)}
        className={[
          'h-10 px-2 rounded-[var(--radius-md)] text-body font-mono',
          'border transition-all duration-fast',
          isActive
            ? 'bg-[var(--color-accent-primary-muted)] text-[var(--color-accent-primary)] border-[var(--color-accent-primary)]'
            : 'bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]',
          'focus:outline-none focus:border-[var(--color-border-focus)]',
        ].join(' ')}
      />
    </div>
  );
}

interface FilterBarProps {
  employees?: FilterOption[];
  positions?: FilterOption[];
  months?: FilterOption[];
  selectedEmployees: string[];
  selectedPositions: string[];
  selectedMonths: string[];
  dateFrom: string | null;
  dateTo: string | null;
  onEmployeesChange: (ids: string[]) => void;
  onPositionsChange: (ids: string[]) => void;
  onMonthsChange: (months: string[]) => void;
  onDateChange: (from: string | null, to: string | null) => void;
  onReset: () => void;
}

export function FilterBar({
  employees = [],
  positions = [],
  months = [],
  selectedEmployees,
  selectedPositions,
  selectedMonths,
  dateFrom,
  dateTo,
  onEmployeesChange,
  onPositionsChange,
  onMonthsChange,
  onDateChange,
  onReset,
}: FilterBarProps) {
  const hasAnyFilter =
    selectedEmployees.length > 0 ||
    selectedPositions.length > 0 ||
    selectedMonths.length > 0 ||
    dateFrom !== null ||
    dateTo !== null;

  // Desktop
  const desktopBar = (
    <div className="hidden lg:flex items-center gap-3 p-3 bg-[var(--color-bg-raised)] rounded-[var(--radius-md)] border-b border-[var(--color-border-default)]">
      {employees.length > 0 && (
        <MultiSelectFilter
          label="Сотрудники"
          options={employees}
          selected={selectedEmployees}
          onChange={onEmployeesChange}
        />
      )}
      {positions.length > 0 && (
        <MultiSelectFilter
          label="Должности"
          options={positions}
          selected={selectedPositions}
          onChange={onPositionsChange}
        />
      )}
      <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={onDateChange} />
      {months.length > 0 && (
        <MultiSelectFilter
          label="Месяцы"
          options={months}
          selected={selectedMonths}
          onChange={onMonthsChange}
        />
      )}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-small text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Сбросить
        </button>
      )}
    </div>
  );

  // Mobile
  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileBar = (
    <div className="lg:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        icon={<Filter className="h-4 w-4" />}
      >
        Фильтры
        {hasAnyFilter && (
          <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)] text-xs">
            {selectedEmployees.length + selectedPositions.length + selectedMonths.length + (dateFrom || dateTo ? 1 : 0)}
          </span>
        )}
      </Button>

      {mobileOpen && (
        <div className="mt-3 p-4 bg-[var(--color-bg-raised)] rounded-[var(--radius-md)] border border-[var(--color-border-default)] space-y-3">
          {employees.length > 0 && (
            <MultiSelectFilter label="Сотрудники" options={employees} selected={selectedEmployees} onChange={onEmployeesChange} />
          )}
          {positions.length > 0 && (
            <MultiSelectFilter label="Должности" options={positions} selected={selectedPositions} onChange={onPositionsChange} />
          )}
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={onDateChange} />
          {months.length > 0 && (
            <MultiSelectFilter label="Месяцы" options={months} selected={selectedMonths} onChange={onMonthsChange} />
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="primary" size="sm" onClick={() => setMobileOpen(false)}>
              Применить
            </Button>
            {hasAnyFilter && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                Сбросить
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {desktopBar}
      {mobileBar}
    </>
  );
}
