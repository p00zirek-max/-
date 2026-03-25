import { useState, type ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  sticky?: boolean;
  render: (row: T, index: number) => ReactNode;
  /** Render for totals row */
  renderTotal?: (rows: T[]) => ReactNode;
}

interface SummaryTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onRowClick?: (row: T, index: number) => void;
  /** Show totals row */
  showTotals?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  className?: string;
}

type SortDir = 'asc' | 'desc';

export function SummaryTable<T>({
  columns,
  data,
  loading = false,
  error,
  onRetry,
  onRowClick,
  showTotals = false,
  emptyMessage = 'Нет данных за выбранный период',
  className = '',
}: SummaryTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-body text-[var(--color-error)]">
          Не удалось загрузить данные
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} icon={<RotateCcw className="h-4 w-4" />}>
            Попробовать снова
          </Button>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={['overflow-x-auto', className].join(' ')}>
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="h-11 bg-[var(--color-bg-overlay)]">
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-3 text-left">
                  <div className="skeleton w-16 h-3" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="h-11 border-b border-[var(--color-border-subtle)]">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5">
                    <div className="skeleton w-20 h-4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-bg-overlay)] flex items-center justify-center">
          <ArrowUpDown className="h-6 w-6 text-[var(--color-text-muted)]" />
        </div>
        <p className="text-body text-[var(--color-text-muted)]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={['overflow-x-auto -webkit-overflow-scrolling-touch', className].join(' ')}>
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="h-11 bg-[var(--color-bg-overlay)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  'px-3 py-3',
                  'text-small font-semibold uppercase tracking-[0.05em]',
                  'text-[var(--color-text-secondary)]',
                  col.sticky ? 'sticky left-0 z-[2] bg-[var(--color-bg-overlay)]' : '',
                  'sticky top-0 z-[3] bg-[var(--color-bg-overlay)]',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  col.sortable ? 'cursor-pointer select-none hover:text-[var(--color-text-primary)]' : '',
                ].join(' ')}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-[var(--color-accent-primary)]" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-[var(--color-accent-primary)]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-[var(--color-text-muted)]" />
                    )
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              className={[
                'h-11 border-b border-[var(--color-border-subtle)]',
                'transition-colors duration-fast',
                onRowClick
                  ? 'cursor-pointer hover:bg-[var(--color-bg-hover)]'
                  : '',
              ].join(' ')}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    'px-3 py-2.5',
                    col.sticky
                      ? 'sticky left-0 z-[2] bg-[var(--color-bg-raised)]'
                      : '',
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left',
                  ].join(' ')}
                >
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        {showTotals && (
          <tfoot>
            <tr className="h-12 bg-[var(--color-bg-overlay)] border-t-2 border-[var(--color-border-default)] sticky bottom-0 z-[1]">
              {columns.map((col, i) => (
                <td
                  key={col.key}
                  className={[
                    'px-3 py-3 font-mono font-semibold',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  ].join(' ')}
                >
                  {i === 0 && !col.renderTotal ? (
                    <span className="uppercase text-small tracking-[0.05em]">
                      Итого
                    </span>
                  ) : (
                    col.renderTotal?.(data)
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
