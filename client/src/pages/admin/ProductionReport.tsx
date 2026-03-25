import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ProductionReportView } from '../../components/ProductionReportView';
import { useToast } from '../../components/ui/Toast';
import { reportsApi } from '../../api/reports';
import { useAuthStore } from '../../store/auth-store';
import type { ProductionReport as ProductionReportType } from '@kinotabel/shared';

export function ProductionReport() {
  const { toast } = useToast();
  const projectId = useAuthStore((s) => s.projectId);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<ProductionReportType | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async (selectedDate: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await reportsApi.getProductionReport(selectedDate);
      setReport(data);
    } catch {
      setReport(null);
      toast('error', 'Не удалось загрузить отчёт');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (date) {
      fetchReport(date);
    }
  }, [date, projectId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap no-print">
        <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">
          Производственный отчёт
        </h1>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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

      <ProductionReportView
        report={report}
        loading={loading}
      />
    </div>
  );
}
