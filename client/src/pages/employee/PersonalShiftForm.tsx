import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ShiftCard } from '../../components/ShiftCard';
import { Spinner, PageSpinner } from '../../components/ui/Spinner';
import { ToastProvider, useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../components/CurrencyDisplay';
import { useAutoSave } from '../../hooks/useAutoSave';
import { usePersonalToken } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth-store';
import { shiftsApi } from '../../api/shifts';
import { employeesApi } from '../../api/employees';
import {
  COEFFICIENT_DISPLAY,
  SHIFT_COEFFICIENTS,
} from '@kinotabel/shared';
import type {
  ShiftInput,
  ShiftCalculation,
  EmployeeWithPositions,
  Shift,
} from '@kinotabel/shared';

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

function PersonalShiftFormInner() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  // Verify personal token
  usePersonalToken(token);

  const initialized = useAuthStore((s) => s.initialized);
  const employeeId = useAuthStore((s) => s.employeeId);
  const displayName = useAuthStore((s) => s.displayName);
  const projectId = useAuthStore((s) => s.projectId);

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [employee, setEmployee] = useState<EmployeeWithPositions | null>(null);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ShiftCalculation | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Autosave
  const { loadDraft, clearDraft } = useAutoSave<FormData>({
    storageKey: `kinotabel-personal-draft-${token}`,
    data: form,
    enabled: !!employeeId,
  });

  // Load employee data and shifts
  useEffect(() => {
    if (!employeeId) return;

    const draft = loadDraft();
    if (draft) setForm(draft);

    employeesApi
      .getEmployee(employeeId)
      .then(setEmployee)
      .catch(() => {});

    shiftsApi
      .getShifts({ employee_id: employeeId })
      .then(setMyShifts)
      .catch(() => {});
  }, [employeeId]);

  // Position options
  const positionOptions = useMemo(
    () =>
      employee?.positions.map((p) => ({
        value: p.id,
        label: p.position,
      })) ?? [],
    [employee],
  );

  // Auto-select first position
  useEffect(() => {
    if (positionOptions.length > 0 && !form.position_id) {
      setForm((f) => ({ ...f, position_id: positionOptions[0].value }));
    }
  }, [positionOptions]);

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
    if (!form.position_id) errs.position_id = 'Выберите должность';
    if (!form.date) errs.date = 'Укажите дату';
    if (!form.shift_start) errs.shift_start = 'Укажите начало';
    if (!form.shift_end) errs.shift_end = 'Укажите конец';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !projectId || !employeeId) return;

    setSubmitting(true);
    setResult(null);

    const input: ShiftInput = {
      project_id: projectId,
      employee_id: employeeId,
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
      const res = await shiftsApi.createShift(input);
      setResult(res.calculation);
      clearDraft();
      setForm(INITIAL_FORM);
      // Refresh shifts list
      const updated = await shiftsApi.getShifts({ employee_id: employeeId });
      setMyShifts(updated);
      toast('success', 'Смена отправлена');
    } catch {
      toast('error', 'Не удалось отправить смену');
    } finally {
      setSubmitting(false);
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <PageSpinner />
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] p-4">
        <Card padding="lg" className="max-w-md text-center space-y-3">
          <h1 className="text-h2 font-bold text-[var(--color-text-primary)]">
            Недействительная ссылка
          </h1>
          <p className="text-body text-[var(--color-text-secondary)]">
            Ссылка устарела или недействительна. Обратитесь к администратору.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] py-6 px-4">
      <div className="max-w-[var(--form-max-width)] mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
            Кинотабель
          </h1>
          <p className="text-body text-[var(--color-text-secondary)]">
            Форма заполнения смены
          </p>
        </div>

        {/* Employee info */}
        <Card padding="md" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-accent-primary-muted)] flex items-center justify-center">
            <span className="text-h3 font-bold text-[var(--color-accent-primary)]">
              {(displayName ?? '?')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-body-medium font-semibold text-[var(--color-text-primary)]">
              {displayName}
            </p>
            {employee && (
              <div className="flex gap-1 flex-wrap">
                {employee.positions.map((p) => (
                  <Badge key={p.id} variant="default">
                    {p.position}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ФИО readonly */}
          <Input
            label="ФИО"
            value={displayName ?? ''}
            readOnly
            disabled
          />

          {/* Должность */}
          <Select
            label="Должность"
            options={positionOptions}
            value={form.position_id}
            onChange={(v) => update('position_id', v)}
            required
            error={errors.position_id}
          />

          {/* Дата */}
          <Input
            type="date"
            label="Дата"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            required
            error={errors.date}
          />

          {/* Адрес */}
          <Input
            label="Адрес"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Место съёмки"
          />

          {/* Начало/конец */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="time"
              label="Начало смены"
              value={form.shift_start}
              onChange={(e) => update('shift_start', e.target.value)}
              required
              error={errors.shift_start}
              step={300}
            />
            <Input
              type="time"
              label="Конец смены"
              value={form.shift_end}
              onChange={(e) => update('shift_end', e.target.value)}
              required
              error={errors.shift_end}
              step={300}
            />
          </div>

          {/* Коэффициент */}
          <Select
            label="Коэффициент смены"
            options={COEFFICIENT_OPTIONS}
            value={form.coefficient}
            onChange={(v) => update('coefficient', v)}
          />

          {/* Кол-во суток */}
          <Select
            label="Кол-во суток"
            options={DAYS_OPTIONS}
            value={form.days_in_shift}
            onChange={(v) => update('days_in_shift', v)}
          />

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-3">
            <Checkbox
              label="Текущий обед"
              checked={form.lunch_current}
              onChange={(e) => update('lunch_current', e.target.checked)}
            />
            <Checkbox
              label="Поздний обед"
              checked={form.lunch_late}
              onChange={(e) => update('lunch_late', e.target.checked)}
            />
            <Checkbox
              label="Без обеда"
              checked={form.lunch_none}
              onChange={(e) => update('lunch_none', e.target.checked)}
            />
            <Checkbox
              label="Ночная смена"
              checked={form.is_night}
              onChange={(e) => update('is_night', e.target.checked)}
            />
          </div>

          {/* Перепробег */}
          <Input
            type="number"
            label="Перепробег, км"
            value={form.overtime_km}
            onChange={(e) => update('overtime_km', e.target.value)}
            min={0}
          />

          {/* Кол-во шт */}
          <Input
            type="number"
            label="Кол-во шт"
            value={form.unit_quantity}
            onChange={(e) => update('unit_quantity', e.target.value)}
            min={0}
          />

          {/* Комментарий */}
          <div className="flex flex-col gap-[var(--space-xs)]">
            <label className="text-body-medium text-[var(--color-text-secondary)]">
              Комментарий
            </label>
            <textarea
              value={form.comment}
              onChange={(e) => update('comment', e.target.value)}
              rows={3}
              className={[
                'px-3 py-2 rounded-[var(--radius-md)]',
                'bg-[var(--color-bg-input)] text-[var(--color-text-primary)]',
                'border border-[var(--color-border-default)]',
                'placeholder:text-[var(--color-text-muted)]',
                'focus:outline-none focus:border-[var(--color-border-focus)] focus:border-2',
                'resize-y min-h-[80px]',
              ].join(' ')}
              placeholder="Примечания..."
            />
          </div>

          <Button
            type="submit"
            loading={submitting}
            icon={<Save className="h-4 w-4" />}
            className="w-full"
          >
            Отправить смену
          </Button>
        </form>

        {/* Result */}
        {result && (
          <Card padding="lg" className="space-y-3">
            <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
              Расчёт
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <span className="text-body text-[var(--color-text-secondary)]">Смена:</span>
              <span className="text-body font-mono text-right">{formatCurrency(result.shift_amount)}</span>
              <span className="text-body text-[var(--color-text-secondary)]">Переработка:</span>
              <span className="text-body font-mono text-right">{formatCurrency(result.overtime_amount)}</span>
              <span className="text-body font-semibold text-[var(--color-text-secondary)]">Итого:</span>
              <span className="text-body font-mono text-right font-semibold">{formatCurrency(result.total_amount)}</span>
              <span className="text-body font-semibold text-[var(--color-text-secondary)]">С ФК:</span>
              <span className="text-body font-mono text-right font-semibold text-[var(--color-accent-primary)]">
                {formatCurrency(result.total_with_fk)}
              </span>
            </div>
          </Card>
        )}

        {/* My shifts */}
        {myShifts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-h2 font-semibold text-[var(--color-text-primary)]">
              Мои смены
            </h2>
            <div className="space-y-2">
              {myShifts.map((shift) => (
                <ShiftCard key={shift.id} shift={shift} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PersonalShiftForm() {
  return (
    <ToastProvider>
      <PersonalShiftFormInner />
    </ToastProvider>
  );
}
