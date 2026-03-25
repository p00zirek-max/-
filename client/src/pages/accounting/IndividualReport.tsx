import { useState, useEffect, useCallback } from 'react';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SummaryTable, type Column } from '../../components/SummaryTable';
import { formatCurrency } from '../../components/CurrencyDisplay';
import { PageSpinner } from '../../components/ui/Spinner';
import { reportsApi, type IndividualReportData } from '../../api/reports';
import { employeesApi } from '../../api/employees';
import { useAuthStore } from '../../store/auth-store';
import type { EmployeeWithPositions } from '@kinotabel/shared';

interface ShiftRow {
  id: string;
  date: string;
  position: string;
  shift_start: string;
  shift_end: string;
  overtime_hours: number;
  total_amount: string;
  total_with_fk: string;
}

function formatDateRu(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function IndividualReport() {
  const projectId = useAuthStore((s) => s.projectId);

  const [employees, setEmployees] = useState<EmployeeWithPositions[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState<IndividualReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoadingEmps(true);
    employeesApi
      .getEmployees({ project_id: projectId })
      .then(setEmployees)
      .finally(() => setLoadingEmps(false));
  }, [projectId]);

  const fetchReport = useCallback(async (empId: string) => {
    if (!empId) return;
    setLoading(true);
    try {
      const data = await reportsApi.getIndividual(empId);
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchReport(selectedId);
    } else {
      setReport(null);
    }
  }, [selectedId, fetchReport]);

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const columns: Column<ShiftRow>[] = [
    {
      key: 'date',
      header: 'Дата',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className="text-body font-mono text-[var(--color-text-primary)]">
          {formatDateRu(row.date)}
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
      width: '80px',
      align: 'right',
      render: (row) => (
        <span className={`text-table-num ${row.overtime_hours > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'}`}>
          {row.overtime_hours > 0 ? `${row.overtime_hours}ч` : '\u2014'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Сумма',
      width: '120px',
      align: 'right',
      render: (row) => (
        <span className="text-currency">{formatCurrency(row.total_amount)}</span>
      ),
      renderTotal: (rows) => {
        if (!report) return null;
        return (
          <span className="text-currency">{formatCurrency(report.totals.grand_total)}</span>
        );
      },
    },
    {
      key: 'total_fk',
      header: 'С ФК',
      width: '120px',
      align: 'right',
      render: (row) => (
        <span className="text-currency">{formatCurrency(row.total_with_fk)}</span>
      ),
      renderTotal: (rows) => {
        if (!report) return null;
        return (
          <span className="text-currency">{formatCurrency(report.totals.grand_total_with_fk)}</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
        Индивидуальный отчёт
      </h1>

      <Select
        label="Сотрудник"
        options={employeeOptions}
        value={selectedId}
        onChange={setSelectedId}
        placeholder="Выберите сотрудника..."
        searchable
        disabled={loadingEmps}
      />

      {loading && <PageSpinner />}

      {report && !loading && (
        <>
          {/* Employee info */}
          <Card padding="md" className="space-y-3">
            <h2 className="text-h2 font-semibold text-[var(--color-text-primary)]">
              {report.employee_name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {report.positions.map((pos) => (
                <div key={pos.position_id} className="flex items-center gap-2">
                  <Badge variant="accent">{pos.position}</Badge>
                  <span className="text-small text-[var(--color-text-muted)]">
                    {formatCurrency(pos.shift_rate)} | ФК {pos.fk_percent}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Shifts table */}
          <SummaryTable
            columns={columns}
            data={report.shifts}
            showTotals={report.shifts.length > 0}
            emptyMessage="Нет смен"
          />

          {/* Totals */}
          <Card padding="md" className="space-y-2">
            <div className="grid grid-cols-2 gap-y-1 gap-x-4 max-w-sm">
              <span className="text-body text-[var(--color-text-secondary)]">Всего смен:</span>
              <span className="text-body font-mono text-right">{report.totals.shift_count}</span>
              <span className="text-body text-[var(--color-text-secondary)]">Переработка:</span>
              <span className="text-body font-mono text-right text-[var(--color-warning)]">
                {report.totals.overtime_hours_total}ч
              </span>
              <span className="text-body font-semibold text-[var(--color-text-secondary)]">Итого:</span>
              <span className="text-body font-mono text-right font-semibold">
                {formatCurrency(report.totals.grand_total)}
              </span>
              <span className="text-body font-semibold text-[var(--color-text-secondary)]">С ФК:</span>
              <span className="text-body font-mono text-right font-semibold text-[var(--color-accent-primary)]">
                {formatCurrency(report.totals.grand_total_with_fk)}
              </span>
            </div>
          </Card>
        </>
      )}

      {!selectedId && !loading && (
        <div className="text-center py-12">
          <p className="text-body text-[var(--color-text-muted)]">
            Выберите сотрудника для просмотра отчёта
          </p>
        </div>
      )}
    </div>
  );
}
