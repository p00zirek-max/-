import type { TimingScene } from '@kinotabel/shared';

interface SceneTimelineProps {
  scenes: TimingScene[];
  /** Shift start time (HH:mm) for scale reference */
  shiftStart?: string;
  /** Shift end time (HH:mm) for scale reference */
  shiftEnd?: string;
  className?: string;
}

function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToPx(minutes: number, startMin: number, totalMin: number, width: number): number {
  return ((minutes - startMin) / totalMin) * width;
}

export function SceneTimeline({
  scenes,
  shiftStart,
  shiftEnd,
  className = '',
}: SceneTimelineProps) {
  if (scenes.length === 0) {
    return (
      <div className={['py-6 text-center', className].join(' ')}>
        <div className="border-t border-dashed border-[var(--color-border-default)] mx-8 mb-2" />
        <p className="text-small text-[var(--color-text-muted)]">
          Сцены не добавлены
        </p>
      </div>
    );
  }

  // Determine time range
  const allTimes: number[] = [];
  scenes.forEach((s) => {
    [s.motor_plan, s.motor_fact, s.stop_plan, s.stop_fact, s.rehearsal_start].forEach((t) => {
      const m = timeToMinutes(t);
      if (m !== null) allTimes.push(m);
    });
  });

  if (shiftStart) {
    const m = timeToMinutes(shiftStart);
    if (m !== null) allTimes.push(m);
  }
  if (shiftEnd) {
    const m = timeToMinutes(shiftEnd);
    if (m !== null) allTimes.push(m);
  }

  if (allTimes.length === 0) return null;

  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const startMin = Math.floor(minTime / 60) * 60; // round to hour
  const endMin = Math.ceil(maxTime / 60) * 60;
  const totalMin = endMin - startMin || 60;

  // Generate hour labels
  const hours: number[] = [];
  for (let h = startMin; h <= endMin; h += 60) {
    hours.push(h);
  }

  const CHART_WIDTH = 600;
  const BAR_HEIGHT = 24;

  return (
    <div className={['overflow-x-auto', className].join(' ')}>
      <div style={{ width: CHART_WIDTH + 80, minWidth: 400 }}>
        {/* Time axis */}
        <div className="flex items-end h-6 ml-[60px] relative" style={{ width: CHART_WIDTH }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute text-xs font-mono text-[var(--color-text-muted)]"
              style={{ left: minutesToPx(h, startMin, totalMin, CHART_WIDTH) - 12 }}
            >
              {`${Math.floor(h / 60).toString().padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        {/* Tick marks */}
        <div className="ml-[60px] relative h-2 border-b border-[var(--color-border-subtle)]" style={{ width: CHART_WIDTH }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute w-px h-2 bg-[var(--color-border-default)]"
              style={{ left: minutesToPx(h, startMin, totalMin, CHART_WIDTH) }}
            />
          ))}
        </div>

        {/* Scenes */}
        <div className="space-y-3 mt-2">
          {scenes.map((scene) => {
            const motorPlan = timeToMinutes(scene.motor_plan);
            const stopPlan = timeToMinutes(scene.stop_plan);
            const motorFact = timeToMinutes(scene.motor_fact);
            const stopFact = timeToMinutes(scene.stop_fact);

            return (
              <div key={scene.id} className="flex items-start gap-2">
                {/* Label */}
                <div className="w-[52px] shrink-0 text-right">
                  <span className="text-small font-medium text-[var(--color-text-primary)]">
                    {scene.scene_number}
                  </span>
                </div>

                {/* Bars */}
                <div className="relative" style={{ width: CHART_WIDTH, height: BAR_HEIGHT * 2 + 4 }}>
                  {/* Vertical grid lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute w-px bg-[var(--color-border-subtle)]"
                      style={{
                        left: minutesToPx(h, startMin, totalMin, CHART_WIDTH),
                        top: 0,
                        height: BAR_HEIGHT * 2 + 4,
                      }}
                    />
                  ))}

                  {/* Plan bar */}
                  {motorPlan !== null && stopPlan !== null && (
                    <div
                      className="absolute rounded-[var(--radius-sm)] opacity-80"
                      style={{
                        left: minutesToPx(motorPlan, startMin, totalMin, CHART_WIDTH),
                        width: Math.max(minutesToPx(stopPlan, startMin, totalMin, CHART_WIDTH) - minutesToPx(motorPlan, startMin, totalMin, CHART_WIDTH), 4),
                        top: 0,
                        height: BAR_HEIGHT,
                        backgroundColor: 'var(--color-shift-planned)',
                      }}
                      title={`План: ${scene.motor_plan} - ${scene.stop_plan}`}
                    />
                  )}

                  {/* Fact bar */}
                  {motorFact !== null && stopFact !== null && (
                    <div
                      className="absolute rounded-[var(--radius-sm)] opacity-80"
                      style={{
                        left: minutesToPx(motorFact, startMin, totalMin, CHART_WIDTH),
                        width: Math.max(minutesToPx(stopFact, startMin, totalMin, CHART_WIDTH) - minutesToPx(motorFact, startMin, totalMin, CHART_WIDTH), 4),
                        top: BAR_HEIGHT + 4,
                        height: BAR_HEIGHT,
                        backgroundColor: 'var(--color-shift-actual)',
                      }}
                      title={`Факт: ${scene.motor_fact} - ${scene.stop_fact}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 ml-[60px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-shift-planned)' }} />
            <span className="text-xs text-[var(--color-text-muted)]">План</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-shift-actual)' }} />
            <span className="text-xs text-[var(--color-text-muted)]">Факт</span>
          </div>
        </div>
      </div>
    </div>
  );
}
