/**
 * API: /api/export — generate XLSX export of reports.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ReportService } from '../server/src/services/report-service';
import { requireAuth, runMiddleware } from '../server/src/middleware/auth';
import type { AuthenticatedRequest } from '../server/src/middleware/auth';
import { reportAccess } from '../server/src/middleware/role-guard';
import { exportRateLimit } from '../server/src/middleware/rate-limit';

const reportService = new ReportService();

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ ok: false, error: `Method ${req.method} not allowed` });
    }

    const { query } = req;
    const projectId = query.project_id as string;
    if (!projectId) {
      return res.status(400).json({ ok: false, error: 'Missing project_id' });
    }

    // Dynamic import of xlsx (heavy library, lazy-load)
    const XLSX = await import('xlsx');

    // Get summary report
    const report = await reportService.getSummaryReport({
      project_id: projectId,
      employee_ids: query.employee_ids
        ? (query.employee_ids as string).split(',')
        : undefined,
      position_ids: query.position_ids
        ? (query.position_ids as string).split(',')
        : undefined,
      date_from: query.date_from as string | undefined,
      date_to: query.date_to as string | undefined,
      months: query.months
        ? (query.months as string).split(',')
        : undefined,
    });

    // Build worksheet data
    const wsData = [
      // Header row
      [
        'ФИО', 'Должность', 'Блок', 'ФК%',
        'Цена смены', 'Цена переработки', 'Цена км', 'Цена шт',
        'Кол-во смен', 'Кол-во шт', 'Переработка, ч', 'Пробег, км',
        'Сумма смен', 'Сумма переработки', 'Сумма км', 'Сумма шт',
        'Итого', 'Итого с ФК',
      ],
      // Data rows
      ...report.rows.map(r => [
        r.employee_name, r.position, r.report_block, r.fk_percent,
        r.shift_rate, r.overtime_hourly_rate, r.km_rate, r.unit_rate,
        r.shift_count, r.unit_count, r.overtime_hours_total, r.km_total,
        r.shifts_total, r.overtime_total, r.km_total_amount, r.units_total,
        r.grand_total, r.grand_total_with_fk,
      ]),
      // Totals row
      [],
      [
        'ИТОГО', '', '', '',
        '', '', '', '',
        report.totals.shift_count, '', '', '',
        '', '', '', '',
        report.totals.grand_total, report.totals.grand_total_with_fk,
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 8 }, { wch: 6 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
      { wch: 14 }, { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Сводный отчёт');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    return res.send(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
}

// Export with middleware chain: export rate limit + auth + report role check
export default runMiddleware(
  [exportRateLimit, requireAuth, reportAccess],
  handler
);
