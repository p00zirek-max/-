import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../components/CurrencyDisplay';
import { useToast } from '../../components/ui/Toast';
import { locationsApi } from '../../api/locations';
import { useAuthStore } from '../../store/auth-store';
import { ROUNDING_LABELS } from '@kinotabel/shared';
import type { Location as LocationType } from '@kinotabel/shared';

const ROUNDING_OPTIONS = Object.entries(ROUNDING_LABELS)
  .filter((_, i) => i % 2 === 0)
  .map(([label, value]) => ({ value, label }));

interface FormData {
  date: string;
  address: string;
  object_name: string;
  shift_start: string;
  shift_end: string;
  shift_rate: string;
  overtime_hourly_rate: string;
  shift_hours: string;
  rounding: string;
  comment: string;
}

const INITIAL: FormData = {
  date: new Date().toISOString().slice(0, 10),
  address: '',
  object_name: '',
  shift_start: '',
  shift_end: '',
  shift_rate: '',
  overtime_hourly_rate: '',
  shift_hours: '12',
  rounding: 'half_hour',
  comment: '',
};

export function LocationsForm() {
  const { toast } = useToast();
  const projectId = useAuthStore((s) => s.projectId);
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === 'admin';

  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LocationType | null>(null);

  const update = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setSubmitting(true);
    setResult(null);
    try {
      const res = await locationsApi.createLocation({
        project_id: projectId,
        date: form.date,
        address: form.address,
        object_name: form.object_name,
        shift_start: form.shift_start,
        shift_end: form.shift_end,
        shift_rate: parseFloat(form.shift_rate) || 0,
        overtime_hourly_rate: parseFloat(form.overtime_hourly_rate) || 0,
        shift_hours: parseFloat(form.shift_hours) || 12,
        rounding: form.rounding as 'half_hour' | 'hour',
        comment: form.comment || undefined,
      });
      setResult(res);
      toast('success', 'Локация сохранена');
    } catch {
      toast('error', 'Не удалось сохранить локацию');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[var(--form-max-width)] mx-auto">
      <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
        Локации
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          type="date"
          label="Дата"
          value={form.date}
          onChange={(e) => update('date', e.target.value)}
          required
        />

        <Input
          label="Адрес"
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          placeholder="Улица, дом"
          required
        />

        <Input
          label="Объект"
          value={form.object_name}
          onChange={(e) => update('object_name', e.target.value)}
          placeholder="Название объекта"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="time"
            label="Начало смены"
            value={form.shift_start}
            onChange={(e) => update('shift_start', e.target.value)}
            required
            step={300}
          />
          <Input
            type="time"
            label="Конец смены"
            value={form.shift_end}
            onChange={(e) => update('shift_end', e.target.value)}
            required
            step={300}
          />
        </div>

        {isAdmin && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="Ставка"
                value={form.shift_rate}
                onChange={(e) => update('shift_rate', e.target.value)}
                min={0}
              />
              <Input
                type="number"
                label="Ставка переработки"
                value={form.overtime_hourly_rate}
                onChange={(e) => update('overtime_hourly_rate', e.target.value)}
                min={0}
                helperText="Почасовая"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="Часов в смене"
                value={form.shift_hours}
                onChange={(e) => update('shift_hours', e.target.value)}
                min={1}
              />
              <Select
                label="Округление"
                options={ROUNDING_OPTIONS}
                value={form.rounding}
                onChange={(v) => update('rounding', v)}
              />
            </div>
          </>
        )}

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
            placeholder="Примечание..."
          />
        </div>

        <Button
          type="submit"
          loading={submitting}
          icon={<Save className="h-4 w-4" />}
          className="w-full"
        >
          Сохранить
        </Button>
      </form>

      {result && (
        <Card padding="lg" className="space-y-3">
          <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
            Результат
          </h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            <span className="text-body text-[var(--color-text-secondary)]">Переработка:</span>
            <span className="text-body font-mono text-right text-[var(--color-warning)]">
              {result.overtime_hours}ч &middot; {formatCurrency(result.overtime_amount)}
            </span>
            <span className="text-body font-semibold text-[var(--color-text-secondary)]">Итого:</span>
            <span className="text-body font-mono text-right font-semibold text-[var(--color-accent-primary)]">
              {formatCurrency(result.total_amount)}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
