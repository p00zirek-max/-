/**
 * API: /api/reports — summary, individual, by-position, production reports.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ReportService } from '../server/src/services/report-service';
import { ProductionReportService } from '../server/src/services/production-report-service';
import { requireAuth, runMiddleware } from '../server/src/middleware/auth';
import type { AuthenticatedRequest } from '../server/src/middleware/auth';
import { reportAccess } from '../server/src/middleware/role-guard';
import { apiRateLimit } from '../server/src/middleware/rate-limit';
import { createFilteredResponse } from '../server/src/middleware/response-filter';

const reportService = new ReportService();
const productionService = new ProductionReportService();

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ ok: false, error: `Method ${req.method} not allowed` });
    }

    const { query } = req;
    const type = query.type as string;
    const projectId = query.project_id as string;

    if (!projectId) {
      return res.status(400).json({ ok: false, error: 'Missing project_id' });
    }

    switch (type) {
      case 'summary': {
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
        return res.json({ ok: true, data: report });
      }

      case 'individual': {
        const employeeId = query.employee_id as string;
        if (!employeeId) {
          return res.status(400).json({ ok: false, error: 'Missing employee_id' });
        }
        const report = await reportService.getIndividualReport(projectId, employeeId);
        return res.json({ ok: true, data: report });
      }

      case 'by-position': {
        const report = await reportService.getByPositionReport(projectId);
        return res.json({ ok: true, data: report });
      }

      case 'production': {
        const date = query.date as string;
        if (!date) {
          return res.status(400).json({ ok: false, error: 'Missing date' });
        }
        const report = await productionService.getProductionReport(projectId, date);
        return res.json({ ok: true, data: report });
      }

      default:
        return res.status(400).json({
          ok: false,
          error: 'Missing or invalid type. Use: summary, individual, by-position, production',
        });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
}

// Export with middleware chain: rate limit + auth + report role check
export default runMiddleware(
  [apiRateLimit, requireAuth, reportAccess],
  handler
);
