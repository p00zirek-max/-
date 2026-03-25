import { useState, useEffect, useCallback } from 'react';
import { FilterBar } from '../../components/FilterBar';
import { SummaryTable, type Column } from '../../components/SummaryTable';
import { formatCurrency } from '../../components/CurrencyDisplay';
import { Badge } from '../../components/ui/Badge';
import { reportsApi } from '../../api/reports';
import { employeesApi } from '../../api/employees';
import { useAuthStore } from '../../store/auth-store';
import { useUiStore } from '../../store/ui-store';
import { REPORT_BLOCK_LABELS } from '@kinotabel/shared';
import type { SummaryReportRow, EmployeeWithPositions, ReportBlock } from '@kinotabel/shared';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const month = (i + 1).toString().padStart(2, '0');
  const names = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  return { value: `2026-${month}`, label: names[i] };
});

export function SummaryReport() {
  const projectId = useAuthStore((s) => s.projectId);
  const { filters, setFilters, resetFilters } = useUiStore();

  const [rows, setRows] = useState<SummaryReportRow[]>([]);
  const [totals, setTotals] = useState({ shift_count: 0, grand_total: '0', grand_total_with_fk: '0' });
  const [employees, setEmployees] = useState<EmployeeWithPositions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(undefined);
    try {
      const [report, emps] = await Promise.all([
        reportsApi.getSummary({
          project_id: projectId,
          employee_ids: filters.employeeIds.length > 0 ? filters.employeeIds : undefined,
          position_ids: filters.positionIds.length > 0 ? filters.positionIds : undefined,
          date_from: filters.dateFrom ?? undefined,
          date_to: filters.dateTo ?? undefined,
          months: filters.months.length > 0 ? filters.months : undefined,
        }),
        employeesApi.getEmployees({ project_id: projectId }),
      ]);
      setRows(report.rows);
      setTotals(report.totals);
      setEmployees(emps);
    } catch {
      setError('Не удалось загрузить отчёт');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  const positionSet = new Map<string, string>();
  employees.forEach((e) =>
    e.positions.forEach((p) => positionSet.set(p.id, p.position)),
  );
  const positionOptions = Array.from(positionSet.entries()).map(([value, label]) => ({
    value,
    label,
  }));

  const columns: Column<SummaryReportRow>[] = [
    {
      key: 'employee_name',
      header: 'ФИО',
      sortable: true,
      sticky: true,
      render: (row) => (
        <span className="text-body-medium text-[var(--color-text-primary)]">
          {row.employee_name}
        </span>
      ),
    },
    {
      key: 'position',
      header: 'Должность',
      render: (row) => (
        <span className="text-body text-[var(--color-text-secondary)]">
          {row.position}
        </span>
      ),
    },
    {
      key: 'fk_percent',
      header: 'ФК%',
      width: '60px',
      align: 'right',
      render: (row) => (
        <span className="text-table-num">{row.fk_percent}%</span>
      ),
    },
    {
      key: 'shift_rate',
      header: 'Ставка',
      width: '100px',
      align: 'right',
      render: (row) => (
        <span className="text-table-num">{formatCurrency(row.shift_rate)}</span>
      ),
    },
    {
      key: 'shift_count',
      header: 'Смены',
      width: '70px',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-table-num">{row.shift_count}</span>
      ),
      renderTotal: () => (
        <span className="text-table-num">{totals.shift_count}</span>
      ),
    },
    {
      key: 'unit_count',
      header: 'Шт',
      width: '60px',
      align: 'right',
      render: (row) => (
        <span className="text-table-num">{row.unit_count || '\u2014'}</span>
      ),
    },
    {
      key: 'overtime_hours',
      header: 'Перераб ч',
      width: '90px',
      align: 'right',
      render: (row) => (
        <span className={`text-table-num ${row.overtime_hours_total > 0 ? 'text-[var(--color-warning)]' : ''}`}>
          {row.overtime_hours_total > 0 ? `${row.overtime_hours_total}ч` : '\u2014'}
        </span>
      ),
    },
    {
      key: 'km_total',
      header: 'Пробег км',
      width: '90px',
      align: 'right',
      render: (row) => (
        <span className="text-table-num">
          {row.km_total > 0 ? row.km_total : '\u2014'}
        </span>
      ),
    },
    {
      key: 'grand_total',
      header: 'Сумма',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-currency">{formatCurrency(row.grand_total)}</span>
      ),
      renderTotal: () => (
        <span className="text-currency">{formatCurrency(totals.grand_total)}</span>
      ),
    },
    {
      key: 'grand_total_with_fk',
      header: 'С ФК',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-currency">{formatCurrency(row.grand_total_with_fk)}</span>
      ),
      renderTotal: () => (
        <span className="text-currency">{formatCurrency(totals.grand_total_with_fk)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
        Сводный отчёт
      </h1>

      <FilterBar
        employees={employeeOptions}
        positions={positionOptions}
        months={MONTH_OPTIONS}
        selectedEmployees={filters.employeeIds}
        selectedPositions={filters.positionIds}
        selectedMonths={filters.months}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        onEmployeesChange={(ids) => setFilters({ employeeIds: ids })}
        onPositionsChange={(ids) => setFilters({ positionIds: ids })}
        onMonthsChange={(m) => setFilters({ months: m })}
        onDateChange={(from, to) => setFilters({ dateFrom: from, dateTo: to })}
        onReset={resetFilters}
      />

      <SummaryTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={fetchData}
        showTotals={rows.length > 0}
        emptyMessage="Нет данных за выбранный период"
      />
    </div>
  );
}
