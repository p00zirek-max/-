import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { TimeRangePicker } from '../../components/TimeRangePicker';
import { useToast } from '../../components/ui/Toast';
import { useAutoSave } from '../../hooks/useAutoSave';
import { timingApi } from '../../api/timing';
import { useAuthStore } from '../../store/auth-store';

interface ShiftTab {
  shift_number: string;
  date: string;
  address: string;
  shift_start_plan: string;
  shift_start_fact: string;
  shift_end_plan: string;
  shift_end_fact: string;
  lunch_start_plan: string;
  lunch_start_fact: string;
  lunch_end_plan: string;
  lunch_end_fact: string;
  scenes_plan: string;
  scenes_fact: string;
}

interface SceneRow {
  id: string;
  scene_number: string;
  rehearsal_start: string;
  motor_plan: string;
  motor_fact: string;
  stop_plan: string;
  stop_fact: string;
  comment: string;
}

const INITIAL_SHIFT: ShiftTab = {
  shift_number: '',
  date: new Date().toISOString().slice(0, 10),
  address: '',
  shift_start_plan: '',
  shift_start_fact: '',
  shift_end_plan: '',
  shift_end_fact: '',
  lunch_start_plan: '',
  lunch_start_fact: '',
  lunch_end_plan: '',
  lunch_end_fact: '',
  scenes_plan: '',
  scenes_fact: '',
};

function makeSceneRow(): SceneRow {
  return {
    id: `scene-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    scene_number: '',
    rehearsal_start: '',
    motor_plan: '',
    motor_fact: '',
    stop_plan: '',
    stop_fact: '',
    comment: '',
  };
}

export function TimingForm() {
  const { toast } = useToast();
  const projectId = useAuthStore((s) => s.projectId);

  const [activeTab, setActiveTab] = useState<'shift' | 'scenes'>('shift');
  const [shiftData, setShiftData] = useState<ShiftTab>(INITIAL_SHIFT);
  const [scenes, setScenes] = useState<SceneRow[]>([makeSceneRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [shiftId, setShiftId] = useState<string | null>(null);

  // Autosave
  const draftPayload = { shiftData, scenes };
  const { loadDraft, clearDraft } = useAutoSave({
    storageKey: `kinotabel-timing-draft-${projectId || 'unknown'}`,
    data: draftPayload,
    enabled: true,
  });

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setShiftData(draft.shiftData);
      setScenes(draft.scenes?.length > 0 ? draft.scenes : [makeSceneRow()]);
    }
  }, []);

  const updateShift = (field: keyof ShiftTab, value: string) => {
    setShiftData((s) => ({ ...s, [field]: value }));
  };

  const updateScene = (id: string, field: keyof SceneRow, value: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const addScene = () => setScenes((prev) => [...prev, makeSceneRow()]);

  const removeScene = (id: string) => {
    setScenes((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  };

  const handleSubmitShift = async () => {
    if (!projectId) return;
    setSubmitting(true);
    try {
      const payload = {
        project_id: projectId,
        shift_number: parseInt(shiftData.shift_number, 10) || 1,
        date: shiftData.date,
        address: shiftData.address,
        shift_start_plan: shiftData.shift_start_plan || null,
        shift_start_fact: shiftData.shift_start_fact || null,
        shift_end_plan: shiftData.shift_end_plan || null,
        shift_end_fact: shiftData.shift_end_fact || null,
        lunch_start_plan: shiftData.lunch_start_plan || null,
        lunch_start_fact: shiftData.lunch_start_fact || null,
        lunch_end_plan: shiftData.lunch_end_plan || null,
        lunch_end_fact: shiftData.lunch_end_fact || null,
        duration_plan: null,
        duration_fact: null,
        scenes_plan: parseInt(shiftData.scenes_plan, 10) || null,
        scenes_fact: parseInt(shiftData.scenes_fact, 10) || null,
        comment: null,
      };

      let savedShift;
      if (shiftId) {
        savedShift = await timingApi.updateShift(shiftId, payload);
      } else {
        savedShift = await timingApi.createShift(payload);
        setShiftId(savedShift.id);
      }

      // Save scenes
      for (const scene of scenes) {
        if (!scene.scene_number) continue;
        await timingApi.createScene({
          shift_id: savedShift.id,
          date: shiftData.date,
          shift_number: savedShift.shift_number,
          scene_number: scene.scene_number,
          rehearsal_start: scene.rehearsal_start || null,
          motor_plan: scene.motor_plan || null,
          motor_fact: scene.motor_fact || null,
          stop_plan: scene.stop_plan || null,
          stop_fact: scene.stop_fact || null,
          duration_plan: null,
          duration_fact: null,
          comment: scene.comment || null,
        });
      }

      clearDraft();
      toast('success', 'Хронометраж сохранён');
    } catch {
      toast('error', 'Не удалось сохранить хронометраж');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[var(--form-max-width)] mx-auto">
      <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
        Хронометраж
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border-default)]">
        {(['shift', 'scenes'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2.5 text-body-medium transition-colors duration-fast',
              'border-b-2 -mb-px',
              activeTab === tab
                ? 'border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {tab === 'shift' ? 'Смена' : 'Сцены'}
          </button>
        ))}
      </div>

      {/* Shift tab */}
      {activeTab === 'shift' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="№ смены"
              value={shiftData.shift_number}
              onChange={(e) => updateShift('shift_number', e.target.value)}
              min={1}
            />
            <Input
              type="date"
              label="Дата"
              value={shiftData.date}
              onChange={(e) => updateShift('date', e.target.value)}
            />
          </div>

          <Input
            label="Адрес"
            value={shiftData.address}
            onChange={(e) => updateShift('address', e.target.value)}
            placeholder="Место съёмки"
          />

          <Card padding="md" className="space-y-4">
            <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
              Смена
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-small font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  План
                </p>
                <TimeRangePicker
                  startValue={shiftData.shift_start_plan}
                  endValue={shiftData.shift_end_plan}
                  onStartChange={(v) => updateShift('shift_start_plan', v)}
                  onEndChange={(v) => updateShift('shift_end_plan', v)}
                  startLabel="Начало"
                  endLabel="Конец"
                />
              </div>
              <div className="space-y-3">
                <p className="text-small font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Факт
                </p>
                <TimeRangePicker
                  startValue={shiftData.shift_start_fact}
                  endValue={shiftData.shift_end_fact}
                  onStartChange={(v) => updateShift('shift_start_fact', v)}
                  onEndChange={(v) => updateShift('shift_end_fact', v)}
                  startLabel="Начало"
                  endLabel="Конец"
                />
              </div>
            </div>
          </Card>

          <Card padding="md" className="space-y-4">
            <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
              Обед
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-small font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  План
                </p>
                <TimeRangePicker
                  startValue={shiftData.lunch_start_plan}
                  endValue={shiftData.lunch_end_plan}
                  onStartChange={(v) => updateShift('lunch_start_plan', v)}
                  onEndChange={(v) => updateShift('lunch_end_plan', v)}
                  startLabel="Начало"
                  endLabel="Конец"
                />
              </div>
              <div className="space-y-3">
                <p className="text-small font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Факт
                </p>
                <TimeRangePicker
                  startValue={shiftData.lunch_start_fact}
                  endValue={shiftData.lunch_end_fact}
                  onStartChange={(v) => updateShift('lunch_start_fact', v)}
                  onEndChange={(v) => updateShift('lunch_end_fact', v)}
                  startLabel="Начало"
                  endLabel="Конец"
                />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Кол-во сцен (план)"
              value={shiftData.scenes_plan}
              onChange={(e) => updateShift('scenes_plan', e.target.value)}
              min={0}
            />
            <Input
              type="number"
              label="Кол-во сцен (факт)"
              value={shiftData.scenes_fact}
              onChange={(e) => updateShift('scenes_fact', e.target.value)}
              min={0}
            />
          </div>
        </div>
      )}

      {/* Scenes tab */}
      {activeTab === 'scenes' && (
        <div className="space-y-4">
          {scenes.map((scene, index) => (
            <Card key={scene.id} padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
                  Сцена {index + 1}
                </h3>
                <button
                  type="button"
                  onClick={() => removeScene(scene.id)}
                  disabled={scenes.length <= 1}
                  className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="№ сцены"
                  value={scene.scene_number}
                  onChange={(e) => updateScene(scene.id, 'scene_number', e.target.value)}
                  placeholder="1A"
                />
                <Input
                  type="time"
                  label="Репетиция"
                  value={scene.rehearsal_start}
                  onChange={(e) => updateScene(scene.id, 'rehearsal_start', e.target.value)}
                  step={60}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="time"
                  label="Мотор (план)"
                  value={scene.motor_plan}
                  onChange={(e) => updateScene(scene.id, 'motor_plan', e.target.value)}
                  step={60}
                />
                <Input
                  type="time"
                  label="Мотор (факт)"
                  value={scene.motor_fact}
                  onChange={(e) => updateScene(scene.id, 'motor_fact', e.target.value)}
                  step={60}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="time"
                  label="Стоп (план)"
                  value={scene.stop_plan}
                  onChange={(e) => updateScene(scene.id, 'stop_plan', e.target.value)}
                  step={60}
                />
                <Input
                  type="time"
                  label="Стоп (факт)"
                  value={scene.stop_fact}
                  onChange={(e) => updateScene(scene.id, 'stop_fact', e.target.value)}
                  step={60}
                />
              </div>

              <Input
                label="Комментарий"
                value={scene.comment}
                onChange={(e) => updateScene(scene.id, 'comment', e.target.value)}
                placeholder="Примечание к сцене"
              />
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addScene}
            icon={<Plus className="h-4 w-4" />}
            className="w-full"
          >
            Добавить сцену
          </Button>
        </div>
      )}

      {/* Save button */}
      <Button
        onClick={handleSubmitShift}
        loading={submitting}
        icon={<Save className="h-4 w-4" />}
        className="w-full"
      >
        Сохранить хронометраж
      </Button>
    </div>
  );
}
