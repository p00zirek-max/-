import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import {
  Wallet, CalendarDays, UserX, Clock, PieChart as PieIcon,
  TrendingUp, Film, FileText,
} from 'lucide-react';
import { DashboardWidget } from '../../components/DashboardWidget';
import { formatCurrency } from '../../components/CurrencyDisplay';
import { dashboardApi } from '../../api/dashboard';
import { useAuthStore } from '../../store/auth-store';
import type { DashboardOverview } from '@kinotabel/shared';

const BLOCK_COLORS = [
  '#6366F1', '#EC4899', '#F97316', '#8B5CF6',
  '#14B8A6', '#A78BFA', '#FB923C', '#22D3EE', '#A3E635',
];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export function Dashboard() {
  const projectId = useAuthStore((s) => s.projectId);
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(false);
    try {
      const result = await dashboardApi.getOverview({ project_id: projectId });
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const pieData = data?.expenses_by_block.map((b) => ({
    name: b.label,
    value: parseFloat(b.total) || 0,
  })) ?? [];

  const lineData = data?.expenses_by_day.map((d) => ({
    date: formatDateShort(d.date),
    total: parseFloat(d.total) || 0,
  })) ?? [];

  const barData = data ? [
    { name: 'Сцены', План: data.scenes_plan_vs_fact.total_plan, Факт: data.scenes_plan_vs_fact.total_fact },
  ] : [];

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
        Дашборд
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Total expenses */}
        <DashboardWidget
          title="Общие расходы"
          icon={<Wallet className="h-4 w-4" />}
          loading={loading}
          error={error}
          onRetry={fetchData}
          value={data ? formatCurrency(data.total_expenses) : undefined}
        />

        {/* 2. Shifts today/week */}
        <DashboardWidget
          title="Смены"
          icon={<CalendarDays className="h-4 w-4" />}
          loading={loading}
          error={error}
          onRetry={fetchData}
          value={data ? `${data.shifts_today}` : undefined}
          onClick={() => navigate('/shifts')}
        >
          {data && (
            <p className="text-small text-[var(--color-text-secondary)] mt-1">
              На этой неделе: {data.shifts_this_week}
            </p>
          )}
        </DashboardWidget>

        {/* 3. Unfilled shifts */}
        <DashboardWidget
          title="Незаполненные смены"
          icon={<UserX className="h-4 w-4" />}
          loading={loading}
          error={error}
          onRetry={fetchData}
          value={data ? `${data.unfilled_employees.length}` : undefined}
        >
          {data && data.unfilled_employees.length > 0 && (
            <ul className="mt-2 space-y-1">
              {data.unfilled_employees.slice(0, 5).map((e) => (
                <li key={e.employee_id} className="text-small text-[var(--color-text-secondary)] truncate">
                  {e.employee_name}
                </li>
              ))}
              {data.unfilled_employees.length > 5 && (
                <li className="text-small text-[var(--color-text-muted)]">
                  ...и ещё {data.unfilled_employees.length - 5}
                </li>
              )}
            </ul>
          )}
        </DashboardWidget>

        {/* 4. Top-5 overtime */}
        <DashboardWidget
          title="Топ-5 переработка"
          icon={<Clock className="h-4 w-4" />}
          loading={loading}
          error={error}
          onRetry={fetchData}
        >
          {data && data.top_overtime.length > 0 && (
            <table className="w-full mt-2">
              <tbody>
                {data.top_overtime.slice(0, 5).map((entry) => (
                  <tr key={entry.employee_id} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                    <td className="py-1.5 text-small text-[var(--color-text-primary)] truncate max-w-[120px]">
                      {entry.employee_name}
                    </td>
                    <td className="py-1.5 text-small text-right font-mono text-[var(--color-warning)]">
                      {entry.overtime_hours}ч
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data && data.top_overtime.length === 0 && (
            <p className="text-small text-[var(--color-text-muted)] mt-2">
              Нет переработок
            </p>
          )}
        </DashboardWidget>

        {/* 5. Expenses by block (pie chart) */}
        <DashboardWidget
          title="Расходы по блокам"
          icon={<PieIcon className="h-4 w-4" />}
          loading={loading}
          error={error}
          onRetry={fetchData}
        >
          {pieData.length > 0 && (
            <div className="mt-2">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={BLOCK_COLORS[i % BLOCK_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-overlay)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: BLOCK_COLORS[i % BLOCK_COLORS.length] }}
                    />
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DashboardWidget>

        {/* 6. Daily expenses (line chart) */}
        <DashboardWidget
          title="Расходы по дням"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={loading}
          error={error}
          onRetry={fetchData}
        >
          {lineData.length > 0 && (
            <div className="mt-2">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                    }
                    width={45}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-overlay)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-accent-primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </DashboardWidget>

        {/* 7. Scenes plan vs fact (bar chart) */}
        <DashboardWidget
          title="Сцены: план / факт"
          icon={<Film className="h-4 w-4" />}
          loading={loading}
          error={error}
          onRetry={fetchData}
        >
          {data && (
            <div className="mt-2">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={30} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-overlay)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '0.7rem' }} />
                  <Bar dataKey="План" fill="var(--color-shift-planned)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Факт" fill="var(--color-shift-actual)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </DashboardWidget>

        {/* 8. Latest production report */}
        <DashboardWidget
          title="Производственный отчёт"
          icon={<FileText className="h-4 w-4" />}
          loading={loading}
          error={error}
          onRetry={fetchData}
          onClick={data?.last_production_report_date ? () => navigate('/reports/production') : undefined}
        >
          {data && (
            <p className="text-body text-[var(--color-text-secondary)] mt-2">
              {data.last_production_report_date
                ? `Последний: ${new Date(data.last_production_report_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Нет отчётов'
              }
            </p>
          )}
        </DashboardWidget>
      </div>
    </div>
  );
}
