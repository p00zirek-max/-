import { useState } from 'react';
import { FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { exportApi } from '../../api/export';
import { useAuthStore } from '../../store/auth-store';

type ExportFormat = 'xlsx' | 'pdf' | 'csv';

export function Export() {
  const { toast } = useToast();
  const projectId = useAuthStore((s) => s.projectId);
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (!projectId) {
      toast('error', 'Проект не выбран');
      return;
    }

    setLoadingFormat(format);
    try {
      switch (format) {
        case 'xlsx':
          await exportApi.downloadXlsx(projectId);
          break;
        case 'pdf':
          await exportApi.downloadPdf(projectId);
          break;
        case 'csv':
          await exportApi.downloadCsv(projectId);
          break;
      }
      toast('success', 'Файл загружен');
    } catch {
      toast('error', 'Не удалось экспортировать');
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="space-y-6 max-w-[var(--form-max-width)] mx-auto">
      <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
        Экспорт данных
      </h1>

      <p className="text-body text-[var(--color-text-secondary)]">
        Скачайте сводный отчёт в удобном формате. Данные включают все смены,
        переработки и расчёты по проекту.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          padding="lg"
          hoverable
          onClick={() => handleExport('xlsx')}
          className="text-center space-y-3"
        >
          <div className="mx-auto w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-success-muted)] flex items-center justify-center">
            <FileSpreadsheet className="h-6 w-6 text-[var(--color-success)]" />
          </div>
          <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
            Excel (XLSX)
          </h3>
          <p className="text-small text-[var(--color-text-secondary)]">
            Таблица с формулами и форматированием
          </p>
          <Button
            variant="outline"
            size="sm"
            loading={loadingFormat === 'xlsx'}
            disabled={!!loadingFormat}
            onClick={(e) => {
              e.stopPropagation();
              handleExport('xlsx');
            }}
            className="w-full"
          >
            Скачать XLSX
          </Button>
        </Card>

        <Card
          padding="lg"
          hoverable
          onClick={() => handleExport('pdf')}
          className="text-center space-y-3"
        >
          <div className="mx-auto w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-error-muted)] flex items-center justify-center">
            <FileText className="h-6 w-6 text-[var(--color-error)]" />
          </div>
          <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
            PDF
          </h3>
          <p className="text-small text-[var(--color-text-secondary)]">
            Для печати и отправки по email
          </p>
          <Button
            variant="outline"
            size="sm"
            loading={loadingFormat === 'pdf'}
            disabled={!!loadingFormat}
            onClick={(e) => {
              e.stopPropagation();
              handleExport('pdf');
            }}
            className="w-full"
          >
            Скачать PDF
          </Button>
        </Card>

        <Card
          padding="lg"
          hoverable
          onClick={() => handleExport('csv')}
          className="text-center space-y-3"
        >
          <div className="mx-auto w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-info-muted)] flex items-center justify-center">
            <FileDown className="h-6 w-6 text-[var(--color-info)]" />
          </div>
          <h3 className="text-h3 font-semibold text-[var(--color-text-primary)]">
            CSV
          </h3>
          <p className="text-small text-[var(--color-text-secondary)]">
            Для импорта в другие системы
          </p>
          <Button
            variant="outline"
            size="sm"
            loading={loadingFormat === 'csv'}
            disabled={!!loadingFormat}
            onClick={(e) => {
              e.stopPropagation();
              handleExport('csv');
            }}
            className="w-full"
          >
            Скачать CSV
          </Button>
        </Card>
      </div>
    </div>
  );
}
