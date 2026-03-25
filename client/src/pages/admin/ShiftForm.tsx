import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CurrencyDisplay, formatCurrency } from '../../components/CurrencyDisplay';
import { useToast } from '../../components/ui/Toast';
import { useAutoSave } from '../../hooks/useAutoSave';
import { shiftsApi } from '../../api/shifts';
import { employeesApi } from '../../api/employees';
import { useAuthStore } from '../../store/auth-store';
import {
  COEFFICIENT_DISPLAY,
  SHIFT_COEFFICIENTS,
} from '@kinotabel/shared';
import type { ShiftInput, ShiftCalculation, EmployeeWithPositions, Shift } from '@kinotabel/shared';

const COEFFICIENT_OPTIONS = Object.entries(COEFFICIENT_DISPLAY).map(
  ([value, label]) => ({ value, label }),
);

const DAYS_OPTIONS = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
];

interface FormData {
  employee_id: string;
  position_id: string;
  date: string;
  address: string;
  shift_start: string;
  shift_end: string;
  coefficient: string;
  days_in_shift: string;
  lunch_current: boolean;
  lunch_late: boolean;
  lunch_none: boolean;
  is_night: boolean;
  overtime_km: string;
  unit_quantity: string;
  comment: string;
}

const INITIAL_FORM: FormData = {
  employee_id: '',
  position_id: '',
  date: new Date().toISOString().slice(0, 10),
  address: '',
  shift_start: '',
  shift_end: '',
  coefficient: String(SHIFT_COEFFICIENTS.FULL),
  days_in_shift: '0',
  lunch_current: false,
  lunch_late: false,
  lunch_none: false,
  is_night: false,
  overtime_km: '0',
  unit_quantity: '0',
  comment: '',
};

export function ShiftForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const projectId = useAuthStore((s) => s.projectId);
  const isEdit = !!id;

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [employees, setEmployees] = useState<EmployeeWithPositions[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<ShiftCalculation | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Employee search
  const [empSearch, setEmpSearch] = useState('');

  // Autosave
  const { loadDraft, clearDraft } = useAutoSave<FormData>({
    storageKey: `kinotabel-shift-draft-${id || 'new'}`,
    data: form,
    enabled: !locked && !isEdit,
  });

  // Load employees
  useEffect(() => {
    if (!projectId) return;
    setLoadingEmployees(true);
    employeesApi
      .getEmployees({ project_id: projectId })
      .then(setEmployees)
      .catch(() => toast('error', 'Не удалось загрузить сотрудников'))
      .finally(() => setLoadingEmployees(false));
  }, [projectId]);

  // Load existing shift for edit
  useEffect(() => {
    if (!id) {
      const draft = loadDraft();
      if (draft) {
        setForm(draft);
      }
      return;
    }
    shiftsApi
      .getShift(id)
      .then((shift: Shift) => {
        setForm({
          employee_id: shift.employee_id,
          position_id: shift.position_id,
          date: shift.date,
          address: shift.address || '',
          shift_start: shift.shift_start,
          shift_end: shift.shift_end,
          coefficient: String(shift.coefficient),
          days_in_shift: String(shift.days_in_shift),
          lunch_current: shift.lunch_current,
          lunch_late: shift.lunch_late,
          lunch_none: shift.lunch_none,
          is_night: shift.is_night,
          overtime_km: String(shift.overtime_km),
          unit_quantity: String(shift.unit_quantity),
          comment: shift.comment || '',
        });
        setLocked(shift.locked);
      })
      .catch(() => toast('error', 'Не удалось загрузить смену'));
  }, [id]);

  // Employee options for searchable select
  const employeeOptions = useMemo(() => {
    const filtered = empSearch
      ? employees.filter((e) =>
          e.name.toLowerCase().includes(empSearch.toLowerCase()),
        )
      : employees;
    return filtered.map((e) => ({ value: e.id, label: e.name }));
  }, [employees, empSearch]);

  // Position options based on selected employee
  const selectedEmployee = employees.find((e) => e.id === form.employee_id);
  const positionOptions = useMemo(
    () =>
      selectedEmployee?.positions.map((p) => ({
        value: p.id,
        label: p.position,
      })) ?? [],
    [selectedEmployee],
  );

  // Reset position when employee changes
  useEffect(() => {
    if (selectedEmployee && positionOptions.length > 0) {
      if (!positionOptions.find((p) => p.value === form.position_id)) {
        setForm((f) => ({ ...f, position_id: positionOptions[0].value }));
      }
    }
  }, [form.employee_id, positionOptions]);

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[field];
      return copy;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.employee_id) errs.employee_id = 'Выберите сотрудника';
    if (!form.position_id) errs.position_id = 'Выберите должность';
    if (!form.date) errs.date = 'Укажите дату';
    if (!form.shift_start) errs.shift_start = 'Укажите начало';
    if (!form.shift_end) errs.shift_end = 'Укажите конец';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !projectId) return;

    setSubmitting(true);
    setResult(null);

    const input: ShiftInput = {
      project_id: projectId,
      employee_id: form.employee_id,
      position_id: form.position_id,
      date: form.date,
      address: form.address || undefined,
      shift_start: form.shift_start,
      shift_end: form.shift_end,
      coefficient: parseFloat(form.coefficient) as ShiftInput['coefficient'],
      days_in_shift: parseInt(form.days_in_shift, 10),
      lunch_current: form.lunch_current,
      lunch_late: form.lunch_late,
      lunch_none: form.lunch_none,
      is_night: form.is_night,
      overtime_km: parseFloat(form.overtime_km) || 0,
      unit_quantity: parseFloat(form.unit_quantity) || 0,
      comment: form.comment || undefined,
    };

    try {
      const res = isEdit
        ? await shiftsApi.updateShift(id!, input)
        : await shiftsApi.createShift(input);
      setResult(res.calculation);
      clearDraft();
      toast('success', isEdit ? 'Смена обновлена' : 'Смена создана');
    } catch {
      toast('error', 'Не удалось сохранить смену');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[var(--form-max-width)] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/shifts')}
          className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
          {isEdit ? 'Редактировать смену' : 'Новая смена'}
        </h1>
        {locked && <Badge variant="warning">Заблокировано</Badge>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. ФИО */}
        <Select
          label="ФИО"
          options={employeeOptions}
          value={form.employee_id}
          onChange={(v) => update('employee_id', v)}
          placeholder="Выберите сотрудника..."
          searchable
          required
          disabled={locked || loadingEmployees}
          error={errors.employee_id}
        />

        {/* 2. Должность */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="Должность"
              options={positionOptions}
              value={form.position_id}
              onChange={(v) => update('position_id', v)}
              placeholder="Выберите должность..."
              required
              disabled={locked || !form.employee_id}
              error={errors.position_id}
            />
          </div>
          {selectedEmployee && !locked && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              icon={<Plus className="h-4 w-4" />}
              title="Добавить ставку"
              onClick={() => navigate(`/employees?add=${form.employee_id}`)}
            />
          )}
        </div>

        {/* 3. Дата */}
        <Input
          type="date"
          label="Дата"
          value={form.date}
          onChange={(e) => update('date', e.target.value)}
          required
          disabled={locked}
          error={errors.date}
        />

        {/* 4. Адрес */}
        <Input
          label="Адрес"
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          placeholder="Место съёмки"
          disabled={locked}
        />

        {/* 5-6. Начало/конец */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="time"
            label="Начало смены"
            value={form.shift_start}
            onChange={(e) => update('shift_start', e.target.value)}
            required
            disabled={locked}
            error={errors.shift_start}
            step={300}
          />
          <Input
            type="time"
            label="Конец смены"
            value={form.shift_end}
            onChange={(e) => update('shift_end', e.target.value)}
            required
            disabled={locked}
            error={errors.shift_end}
            step={300}
          />
        </div>

        {/* 7. Коэффициент */}
        <Select
          label="Коэффициент смены"
          options={COEFFICIENT_OPTIONS}
          value={form.coefficient}
          onChange={(v) => update('coefficient', v)}
          disabled={locked}
        />

        {/* 8. Кол-во суток */}
        <Select
          label="Кол-во суток"
          options={DAYS_OPTIONS}
          value={form.days_in_shift}
          onChange={(v) => update('days_in_shift', v)}
          disabled={locked}
        />

        {/* 9-12. Checkboxes */}
        <div className="grid grid-cols-2 gap-3">
          <Checkbox
            label="Текущий обед"
            checked={form.lunch_current}
            onChange={(e) => update('lunch_current', e.target.checked)}
            disabled={locked}
          />
          <Checkbox
            label="Поздний обед"
            checked={form.lunch_late}
            onChange={(e) => update('lunch_late', e.target.checked)}
            disabled={locked}
          />
          <Checkbox
            label="Без обеда"
            checked={form.lunch_none}
            onChange={(e) => update('lunch_none', e.target.checked)}
            disabled={locked}
          />
          <Checkbox
            label="Ночная смена"
            checked={form.is_night}
            onChange={(e) => update('is_night', e.target.checked)}
            disabled={locked}
          />
        </div>

        {/* 13. Перепробег */}
        <Input
          type="number"
          label="Перепробег, км"
          value={form.overtime_km}
          onChange={(e) => update('overtime_km', e.target.value)}
          min={0}
          disabled={locked}
        />

        {/* 14. Кол-во шт */}
        <Input
          type="number"
          label="Кол-во шт"
          value={form.unit_quantity}
          onChange={(e) => update('unit_quantity', e.target.value)}
          min={0}
          disabled={locked}
        />

        {/* 15. Комментарий */}
        <div className="flex flex-col gap-[var(--space-xs)]">
          <label className="text-body-medium text-[var(--color-text-secondary)]">
            Комментарий
          </label>
          <textarea
            value={form.comment}
            onChange={(e) => update('comment', e.target.value)}
            disabled={locked}
            rows={3}
            className={[
              'px-3 py-2 rounded-[var(--radius-md)]',
              'bg-[var(--color-bg-input)] text-[var(--color-text-primary)]',
              'border border-[var(--color-border-default)]',
              'placeholder:text-[var(--color-text-muted)]',
              'focus:outline-none focus:border-[var(--color-border-focus)] focus:border-2',
              'disabled:bg-[var(--color-bg-base)] disabled:text-[var(--color-text-disabled)]',
              'resize-y min-h-[80px]',
            ].join(' ')}
            placeholder="Примечания к смене..."
          />
        </div>

        {/* Submit */}
        {!locked && (
          <Button
            type="submit"
            loading={submitting}
            icon={<Save className="h-4 w-4" />}
            className="w-full"
          >
            {isEdit ? 'Сохранить изменения' : 'Создать смену'}
          </Button>
        )}
      </form>

      {/* Result card */}
      {result && (
        <Card padding="lg" className="space-y-3">
          <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
            Расчёт
          </h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            <span className="text-body text-[var(--color-text-secondary)]">Смена:</span>
            <span className="text-body font-mono text-right text-[var(--color-text-primary)]">
              {formatCurrency(result.shift_amount)}
            </span>

            <span className="text-body text-[var(--color-text-secondary)]">Переработка:</span>
            <span className="text-body font-mono text-right text-[var(--color-text-primary)]">
              {formatCurrency(result.overtime_amount)}
            </span>

            <span className="text-body text-[var(--color-text-secondary)]">Итого:</span>
            <span className="text-body font-mono text-right font-semibold text-[var(--color-text-primary)]">
              {formatCurrency(result.total_amount)}
            </span>

            <span className="text-body text-[var(--color-text-secondary)]">С ФК:</span>
            <span className="text-body font-mono text-right font-semibold text-[var(--color-accent-primary)]">
              {formatCurrency(result.total_with_fk)}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
