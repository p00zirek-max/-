import { useState, useEffect, useCallback } from 'react';
import { Plus, Link as LinkIcon, Copy } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { SummaryTable, type Column } from '../../components/SummaryTable';
import { useToast } from '../../components/ui/Toast';
import { employeesApi } from '../../api/employees';
import { useAuthStore } from '../../store/auth-store';
import { REPORT_BLOCK_LABELS } from '@kinotabel/shared';
import type { EmployeeWithPositions, EmployeeCategory, ReportBlock } from '@kinotabel/shared';

const CATEGORY_LABELS: Record<EmployeeCategory, string> = {
  crew: 'Съёмочная группа',
  cast: 'Актёры',
  extras: 'Массовка',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function Employees() {
  const { toast } = useToast();
  const projectId = useAuthStore((s) => s.projectId);
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === 'admin';

  const [employees, setEmployees] = useState<EmployeeWithPositions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [selected, setSelected] = useState<EmployeeWithPositions | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add employee form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string>('crew');
  const [addLoading, setAddLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(undefined);
    try {
      const data = await employeesApi.getEmployees({ project_id: projectId });
      setEmployees(data);
    } catch {
      setError('Не удалось загрузить сотрудников');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: Column<EmployeeWithPositions>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '80px',
      render: (row) => (
        <span className="text-small font-mono text-[var(--color-text-muted)]">
          {row.id.slice(0, 6)}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'ФИО',
      sortable: true,
      sticky: true,
      render: (row) => (
        <span className="text-body-medium text-[var(--color-text-primary)]">
          {row.name}
        </span>
      ),
    },
    {
      key: 'positions',
      header: 'Должность(и)',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.positions.map((p) => (
            <Badge key={p.id} variant="default">
              {p.position}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Категория',
      width: '140px',
      render: (row) => (
        <span className="text-body text-[var(--color-text-secondary)]">
          {CATEGORY_LABELS[row.category] ?? row.category}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      width: '100px',
      align: 'center',
      render: (row) =>
        row.is_active ? (
          <Badge variant="success">Активен</Badge>
        ) : (
          <Badge variant="default">Неактивен</Badge>
        ),
    },
  ];

  const handleAdd = async () => {
    if (!projectId || !newName.trim()) return;
    setAddLoading(true);
    try {
      await employeesApi.createEmployee({
        project_id: projectId,
        name: newName.trim(),
        category: newCategory as EmployeeCategory,
        telegram_chat_id: null,
        payment_type: 'per_shift',
        accord_amount: null,
        is_active: true,
        attached_from: null,
        attached_to: null,
      });
      toast('success', 'Сотрудник добавлен');
      setShowAddModal(false);
      setNewName('');
      fetchData();
    } catch {
      toast('error', 'Не удалось добавить сотрудника');
    } finally {
      setAddLoading(false);
    }
  };

  const copyPersonalLink = (emp: EmployeeWithPositions) => {
    if (!emp.personal_token) {
      toast('info', 'У сотрудника нет персональной ссылки');
      return;
    }
    const link = `${window.location.origin}/form/${emp.personal_token}`;
    navigator.clipboard.writeText(link).then(
      () => toast('success', 'Ссылка скопирована'),
      () => toast('error', 'Не удалось скопировать'),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
          Сотрудники
        </h1>
        {isAdmin && (
          <Button
            onClick={() => setShowAddModal(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Добавить сотрудника
          </Button>
        )}
      </div>

      <SummaryTable
        columns={columns}
        data={employees}
        loading={loading}
        error={error}
        onRetry={fetchData}
        onRowClick={(row) => setSelected(row)}
        emptyMessage="Нет сотрудников"
      />

      {/* Employee detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        maxWidth="max-w-xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={selected.is_active ? 'success' : 'default'}>
                {selected.is_active ? 'Активен' : 'Неактивен'}
              </Badge>
              <Badge variant="accent">
                {CATEGORY_LABELS[selected.category]}
              </Badge>
            </div>

            <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
              Должности
            </h3>
            {selected.positions.length === 0 ? (
              <p className="text-body text-[var(--color-text-muted)]">
                Нет должностей
              </p>
            ) : (
              <div className="space-y-2">
                {selected.positions.map((pos) => (
                  <Card key={pos.id} padding="sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-body-medium font-semibold text-[var(--color-text-primary)]">
                        {pos.position}
                      </span>
                      <Badge variant="default">
                        {REPORT_BLOCK_LABELS[pos.report_block as ReportBlock] ?? pos.report_block}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-small">
                      <span className="text-[var(--color-text-secondary)]">Ставка:</span>
                      <span className="font-mono text-right">{pos.shift_rate} &#8381;</span>
                      <span className="text-[var(--color-text-secondary)]">Перераб. &#8381;/ч:</span>
                      <span className="font-mono text-right">{pos.overtime_hourly_rate} &#8381;</span>
                      <span className="text-[var(--color-text-secondary)]">КМ &#8381;:</span>
                      <span className="font-mono text-right">{pos.km_rate} &#8381;</span>
                      <span className="text-[var(--color-text-secondary)]">ФК%:</span>
                      <span className="font-mono text-right">{pos.fk_percent}%</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Personal link */}
            {selected.personal_token && (
              <Button
                variant="outline"
                size="sm"
                icon={<LinkIcon className="h-4 w-4" />}
                onClick={() => copyPersonalLink(selected)}
              >
                Скопировать ссылку
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Add employee modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Новый сотрудник"
      >
        <div className="space-y-4">
          <Input
            label="ФИО"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Иванов Иван Иванович"
            required
          />
          <Select
            label="Категория"
            options={CATEGORY_OPTIONS}
            value={newCategory}
            onChange={setNewCategory}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleAdd} loading={addLoading}>
              Добавить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
