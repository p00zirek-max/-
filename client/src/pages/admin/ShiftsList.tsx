import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SummaryTable, type Column } from '../../components/SummaryTable';
import { FilterBar } from '../../components/FilterBar';
import { StatusBadge } from '../../components/StatusBadge';
import { OvertimeIndicator } from '../../components/OvertimeIndicator';
import { formatCurrency } from '../../components/CurrencyDisplay';
import { shiftsApi } from '../../api/shifts';
import { employeesApi } from '../../api/employees';
import { useAuthStore } from '../../store/auth-store';
import { useUiStore } from '../../store/ui-store';
import type { Shift, EmployeeWithPositions } from '@kinotabel/shared';

function formatDateRu(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStatus(shift: Shift): 'locked' | 'night' | 'confirmed' {
  if (shift.locked) return 'locked';
  if (shift.is_night) return 'night';
  return 'confirmed';
}

export function ShiftsList() {
  const navigate = useNavigate();
  const projectId = useAuthStore((s) => s.projectId);
  const role = useAuthStore((s) => s.role);
  const { filters, setFilters, resetFilters } = useUiStore();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithPositions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const canCreate = role === 'admin' || role === 'ams';

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(undefined);
    try {
      const [shiftsData, emps] = await Promise.all([
        shiftsApi.getShifts({
          project_id: projectId,
          date_from: filters.dateFrom ?? undefined,
          date_to: filters.dateTo ?? undefined,
        }),
        employeesApi.getEmployees({ project_id: projectId }),
      ]);
      setShifts(shiftsData);
      setEmployees(emps);
    } catch {
      setError('Не удалось загрузить смены');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build filter options
  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const positionSet = new Map<string, string>();
  employees.forEach((e) =>
    e.positions.forEach((p) => positionSet.set(p.id, p.position)),
  );
  const positionOptions = Array.from(positionSet.entries()).map(([value, label]) => ({
    value,
    label,
  }));

  // Apply client-side filters
  let filtered = shifts;
  if (filters.employeeIds.length > 0) {
    filtered = filtered.filter((s) => filters.employeeIds.includes(s.employee_id));
  }
  if (filters.positionIds.length > 0) {
    filtered = filtered.filter((s) => filters.positionIds.includes(s.position_id));
  }

  // Find employee name by ID
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const posMap = new Map<string, string>();
  employees.forEach((e) =>
    e.positions.forEach((p) => posMap.set(p.id, p.position)),
  );

  const columns: Column<Shift>[] = [
    {
      key: 'date',
      header: 'Дата',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className="text-body text-[var(--color-text-primary)] font-mono">
          {formatDateRu(row.date)}
        </span>
      ),
    },
    {
      key: 'employee',
      header: 'Сотрудник',
      sortable: true,
      render: (row) => (
        <span className="text-body text-[var(--color-text-primary)]">
          {empMap.get(row.employee_id)?.name ?? row.employee_id}
        </span>
      ),
    },
    {
      key: 'position',
      header: 'Должность',
      render: (row) => (
        <span className="text-body text-[var(--color-text-secondary)]">
          {posMap.get(row.position_id) ?? row.position_id}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Начало-Конец',
      width: '120px',
      render: (row) => (
        <span className="text-body font-mono text-[var(--color-text-primary)]">
          {row.shift_start}&ndash;{row.shift_end}
        </span>
      ),
    },
    {
      key: 'overtime',
      header: 'Перераб',
      width: '100px',
      align: 'center',
      render: (row) =>
        row.overtime_hours > 0 ? (
          <OvertimeIndicator hours={row.overtime_hours} />
        ) : (
          <span className="text-small text-[var(--color-text-muted)]">&mdash;</span>
        ),
    },
    {
      key: 'total',
      header: 'Сумма',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-currency">{formatCurrency(row.total_amount)}</span>
      ),
      renderTotal: (rows) => (
        <span className="text-currency">
          {formatCurrency(
            rows.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0).toString(),
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      width: '130px',
      align: 'center',
      render: (row) => <StatusBadge status={getStatus(row)} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
          Смены
        </h1>
        {canCreate && (
          <Button
            onClick={() => navigate('/shifts/new')}
            icon={<Plus className="h-4 w-4" />}
          >
            Новая смена
          </Button>
        )}
      </div>

      <FilterBar
        employees={employeeOptions}
        positions={positionOptions}
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
        data={filtered}
        loading={loading}
        error={error}
        onRetry={fetchData}
        onRowClick={(row) => navigate(`/shifts/${row.id}`)}
        showTotals={filtered.length > 0}
        emptyMessage="Нет смен за выбранный период"
      />
    </div>
  );
}
