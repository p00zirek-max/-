import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../components/CurrencyDisplay';
import { useToast } from '../../components/ui/Toast';
import { extrasApi } from '../../api/extras';
import { useAuthStore } from '../../store/auth-store';
import { ROUNDING_LABELS } from '@kinotabel/shared';
import type { Extras } from '@kinotabel/shared';

const ROUNDING_OPTIONS = Object.entries(ROUNDING_LABELS)
  .filter((_, i) => i % 2 === 0) // skip lowercase duplicates
  .map(([label, value]) => ({ value, label }));

interface FormData {
  date: string;
  role: string;
  quantity: string;
  rate: string;
  overtime_rate: string;
  shift_hours: string;
  rounding: string;
  shift_start: string;
  shift_end: string;
  comment: string;
}

const INITIAL: FormData = {
  date: new Date().toISOString().slice(0, 10),
  role: '',
  quantity: '1',
  rate: '',
  overtime_rate: '',
  shift_hours: '12',
  rounding: 'half_hour',
  shift_start: '',
  shift_end: '',
  comment: '',
};

export function ExtrasForm() {
  const { toast } = useToast();
  const projectId = useAuthStore((s) => s.projectId);

  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Extras | null>(null);

  const update = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setSubmitting(true);
    setResult(null);
    try {
      const res = await extrasApi.createExtra({
        project_id: projectId,
        date: form.date,
        role: form.role,
        quantity: parseInt(form.quantity, 10) || 1,
        rate: parseFloat(form.rate) || 0,
        overtime_rate: parseFloat(form.overtime_rate) || 0,
        shift_hours: parseFloat(form.shift_hours) || 12,
        rounding: form.rounding as 'half_hour' | 'hour',
        shift_start: form.shift_start,
        shift_end: form.shift_end,
        comment: form.comment || undefined,
      });
      setResult(res);
      toast('success', 'АМС смена создана');
    } catch {
      toast('error', 'Не удалось сохранить');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[var(--form-max-width)] mx-auto">
      <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
        АМС (массовка)
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
          label="Роль"
          value={form.role}
          onChange={(e) => update('role', e.target.value)}
          placeholder="Прохожие, официанты и т.д."
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            label="Кол-во"
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            min={1}
            required
          />
          <Input
            type="number"
            label="Ставка"
            value={form.rate}
            onChange={(e) => update('rate', e.target.value)}
            min={0}
            required
            helperText="За одного человека"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            label="Ставка переработки"
            value={form.overtime_rate}
            onChange={(e) => update('overtime_rate', e.target.value)}
            min={0}
            helperText="Почасовая"
          />
          <Input
            type="number"
            label="Часов в смене"
            value={form.shift_hours}
            onChange={(e) => update('shift_hours', e.target.value)}
            min={1}
          />
        </div>

        <Select
          label="Округление"
          options={ROUNDING_OPTIONS}
          value={form.rounding}
          onChange={(v) => update('rounding', v)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="time"
            label="Начало"
            value={form.shift_start}
            onChange={(e) => update('shift_start', e.target.value)}
            required
            step={300}
          />
          <Input
            type="time"
            label="Конец"
            value={form.shift_end}
            onChange={(e) => update('shift_end', e.target.value)}
            required
            step={300}
          />
        </div>

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
            Расчёт
          </h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            <span className="text-body text-[var(--color-text-secondary)]">Смены:</span>
            <span className="text-body font-mono text-right text-[var(--color-text-primary)]">
              {formatCurrency(result.shift_total)}
            </span>
            <span className="text-body text-[var(--color-text-secondary)]">Переработка:</span>
            <span className="text-body font-mono text-right text-[var(--color-text-primary)]">
              {formatCurrency(result.overtime_total)}
            </span>
            <span className="text-body text-[var(--color-text-secondary)]">Переработка (ч):</span>
            <span className="text-body font-mono text-right text-[var(--color-warning)]">
              {result.overtime_hours}ч
            </span>
            <span className="text-body font-semibold text-[var(--color-text-secondary)]">Итого:</span>
            <span className="text-body font-mono text-right font-semibold text-[var(--color-accent-primary)]">
              {formatCurrency(result.grand_total)}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
