import type { ProductionReport } from '@kinotabel/shared';
import { REPORT_BLOCK_ORDER, REPORT_BLOCK_LABELS, type ReportBlock } from '@kinotabel/shared';
import { formatCurrency } from './CurrencyDisplay';
import { SceneTimeline } from './SceneTimeline';
import { Button } from './ui/Button';
import { FileText, Table, Printer } from 'lucide-react';

interface ProductionReportViewProps {
  report: ProductionReport | null;
  loading?: boolean;
  onExportPdf?: () => void;
  onExportXlsx?: () => void;
}

const blockColors: Record<string, string> = {
  A: 'var(--color-block-actors)',
  P: 'var(--color-block-crew)',
  T: 'var(--color-block-transport)',
  D: 'var(--color-block-extra-staff)',
  E: 'var(--color-block-equipment)',
  M: 'var(--color-block-extras)',
  K: 'var(--color-block-costume)',
  R: 'var(--color-block-props)',
  L: 'var(--color-block-location)',
};

const blockBgColors: Record<string, string> = {
  A: 'var(--color-block-actors-bg)',
  P: 'var(--color-block-crew-bg)',
  T: 'var(--color-block-transport-bg)',
  D: 'var(--color-block-extra-staff-bg)',
  E: 'var(--color-block-equipment-bg)',
  M: 'var(--color-block-extras-bg)',
  K: 'var(--color-block-costume-bg)',
  R: 'var(--color-block-props-bg)',
  L: 'var(--color-block-location-bg)',
};

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ProductionReportView({
  report,
  loading,
  onExportPdf,
  onExportXlsx,
}: ProductionReportViewProps) {
  if (loading) {
    return (
      <div className="max-w-[var(--report-max-width)] mx-auto p-6 space-y-6">
        <div className="skeleton w-64 h-8 mx-auto" />
        <div className="skeleton w-40 h-5 mx-auto" />
        <div className="skeleton w-full h-24" />
        <div className="skeleton w-full h-32" />
        <div className="skeleton w-full h-32" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-[var(--report-max-width)] mx-auto p-6 text-center">
        <p className="text-body text-[var(--color-text-muted)]">
          Нет данных за выбранную дату
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto p-6 lg:p-4 space-y-6 print:bg-white print:text-black">
      {/* Header */}
      <div className="text-center space-y-1 border-b border-[var(--color-border-default)] pb-4">
        <h1 className="text-h1 text-[var(--color-text-primary)] uppercase tracking-[0.05em]">
          Производственный отчёт
        </h1>
        <h2 className="text-h2 text-[var(--color-text-primary)]">
          {report.project_name} | Смена №{report.shift_number}
        </h2>
        <p className="text-h3 text-[var(--color-text-secondary)]">
          {formatDateFull(report.date)}
        </p>
        <div className="flex justify-center gap-8 text-body text-[var(--color-text-secondary)]">
          <span>Режиссёр: {report.director}</span>
          <span>Оператор: {report.cameraman}</span>
        </div>
      </div>

      {/* Timing info */}
      {report.timing && (
        <div className="border-b border-[var(--color-border-default)] pb-4">
          <h3 className="text-h3 font-semibold mb-3 uppercase tracking-[0.05em]">
            Информация о съёмочном дне
          </h3>
          <div className="overflow-x-auto">
            <table className="text-small">
              <thead>
                <tr className="text-[var(--color-text-secondary)]">
                  <th className="pr-6 py-1 text-left" />
                  <th className="px-4 py-1 text-center font-medium">План</th>
                  <th className="px-4 py-1 text-center font-medium">Факт</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr>
                  <td className="pr-6 py-1 text-[var(--color-text-secondary)]">Начало</td>
                  <td className="px-4 py-1 text-center">{report.timing.shift_start_plan || '\u2014'}</td>
                  <td className="px-4 py-1 text-center">{report.timing.shift_start_fact || '\u2014'}</td>
                </tr>
                <tr>
                  <td className="pr-6 py-1 text-[var(--color-text-secondary)]">Обед</td>
                  <td className="px-4 py-1 text-center">
                    {report.timing.lunch_start_plan && report.timing.lunch_end_plan
                      ? `${report.timing.lunch_start_plan}-${report.timing.lunch_end_plan}`
                      : '\u2014'}
                  </td>
                  <td className="px-4 py-1 text-center">
                    {report.timing.lunch_start_fact && report.timing.lunch_end_fact
                      ? `${report.timing.lunch_start_fact}-${report.timing.lunch_end_fact}`
                      : '\u2014'}
                  </td>
                </tr>
                <tr>
                  <td className="pr-6 py-1 text-[var(--color-text-secondary)]">Стоп</td>
                  <td className="px-4 py-1 text-center">{report.timing.shift_end_plan || '\u2014'}</td>
                  <td className="px-4 py-1 text-center">{report.timing.shift_end_fact || '\u2014'}</td>
                </tr>
                <tr>
                  <td className="pr-6 py-1 text-[var(--color-text-secondary)]">Хронометраж</td>
                  <td className="px-4 py-1 text-center">{report.timing.duration_plan || '\u2014'}</td>
                  <td className="px-4 py-1 text-center">{report.timing.duration_fact || '\u2014'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scenes */}
      {report.scenes.length > 0 && (
        <div className="border-b border-[var(--color-border-default)] pb-4">
          <h3 className="text-h3 font-semibold mb-3 uppercase tracking-[0.05em]">
            Сцены
          </h3>
          <SceneTimeline
            scenes={report.scenes}
            shiftStart={report.timing?.shift_start_fact || undefined}
            shiftEnd={report.timing?.shift_end_fact || undefined}
          />
        </div>
      )}

      {/* Report blocks */}
      {REPORT_BLOCK_ORDER.map((block) => {
        const section = report.blocks[block];
        if (!section || section.items.length === 0) return null;

        const color = blockColors[block] || 'var(--color-text-muted)';
        const bgColor = blockBgColors[block] || 'transparent';

        return (
          <div
            key={block}
            className="border-l-4 rounded-[var(--radius-md)] overflow-hidden"
            style={{
              borderLeftColor: color,
              backgroundColor: bgColor,
            }}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: bgColor, color }}
                >
                  {block}
                </span>
                <h3
                  className="text-h3 font-semibold uppercase tracking-[0.05em]"
                  style={{ color }}
                >
                  {REPORT_BLOCK_LABELS[block as ReportBlock]}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-small">
                  <thead>
                    <tr className="text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)]">
                      <th className="py-2 pr-3 text-left font-medium">Должность</th>
                      <th className="py-2 px-3 text-left font-medium">ФИО</th>
                      <th className="py-2 px-3 text-right font-medium">Цена</th>
                      <th className="py-2 px-3 text-center font-medium">Вызов</th>
                      <th className="py-2 px-3 text-center font-medium">Конец</th>
                      <th className="py-2 px-3 text-right font-medium">Перераб.</th>
                      <th className="py-2 px-3 text-right font-medium">Перепробег</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr
                        key={item.employee_id}
                        className="border-b border-[var(--color-border-subtle)]"
                      >
                        <td className="py-2 pr-3 text-[var(--color-text-primary)]">
                          {item.position}
                        </td>
                        <td className="py-2 px-3 text-[var(--color-text-primary)]">
                          {item.employee_name}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatCurrency(item.shift_rate)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          {item.shift_start}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          {item.shift_end}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {item.overtime_hours > 0 ? `${item.overtime_hours}\u0447` : '\u2014'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {item.overtime_km > 0 ? `${item.overtime_km} \u043A\u043C` : '\u2014'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {/* Export buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border-default)] no-print">
        {onExportPdf && (
          <Button variant="outline" size="sm" onClick={onExportPdf} icon={<FileText className="h-4 w-4" />}>
            PDF
          </Button>
        )}
        {onExportXlsx && (
          <Button variant="outline" size="sm" onClick={onExportXlsx} icon={<Table className="h-4 w-4" />}>
            Excel
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.print()}
          icon={<Printer className="h-4 w-4" />}
        >
          Печать
        </Button>
      </div>
    </div>
  );
}
