/**
 * API: /api/dashboard — overview with all 8 widgets.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DashboardService } from '../server/src/services/dashboard-service';
import { requireAuth, runMiddleware } from '../server/src/middleware/auth';
import type { AuthenticatedRequest } from '../server/src/middleware/auth';
import { reportAccess } from '../server/src/middleware/role-guard';
import { apiRateLimit } from '../server/src/middleware/rate-limit';

const service = new DashboardService();

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

    const overview = await service.getOverview(
      projectId,
      query.date_from as string | undefined,
      query.date_to as string | undefined,
    );

    return res.json({ ok: true, data: overview });
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
