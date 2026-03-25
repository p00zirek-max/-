/**
 * API: /api/extras — АМС (mass scene workers) CRUD.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ExtrasService } from '../server/src/services/extras-service';
import { requireAuth, runMiddleware } from '../server/src/middleware/auth';
import type { AuthenticatedRequest } from '../server/src/middleware/auth';
import { apiRateLimit } from '../server/src/middleware/rate-limit';
import { createFilteredResponse } from '../server/src/middleware/response-filter';
import type { RoundingMode } from '@kinotabel/shared';

const service = new ExtrasService();

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { method, query, body } = req;

    switch (method) {
      case 'GET': {
        if (query.id) {
          const item = await service.getById(query.id as string);
          if (!item) return res.status(404).json({ ok: false, error: 'Extras not found' });
          return res.json({ ok: true, data: item });
        }

        const items = await service.getAll({
          project_id: query.project_id as string,
          date: query.date as string | undefined,
          date_from: query.date_from as string | undefined,
          date_to: query.date_to as string | undefined,
        });
        return res.json({ ok: true, data: items, meta: { total: items.length } });
      }

      case 'POST': {
        const created = await service.create({
          project_id: body.project_id,
          date: body.date,
          role: body.role,
          quantity: Number(body.quantity),
          rate: Number(body.rate),
          overtime_rate: Number(body.overtime_rate),
          shift_hours: Number(body.shift_hours),
          rounding: (body.rounding || 'hour') as RoundingMode,
          shift_start: body.shift_start,
          shift_end: body.shift_end,
          days_in_shift: Number(body.days_in_shift) || 0,
          comment: body.comment,
        });
        return res.status(201).json({ ok: true, data: created });
      }

      case 'PUT': {
        const id = query.id as string;
        if (!id) return res.status(400).json({ ok: false, error: 'Missing id' });
        const updated = await service.update(id, body);
        return res.json({ ok: true, data: updated });
      }

      case 'DELETE': {
        const deleteId = query.id as string;
        if (!deleteId) return res.status(400).json({ ok: false, error: 'Missing id' });
        await service.delete(deleteId);
        return res.json({ ok: true, data: null });
      }

      default:
        res.setHeader('Allow', 'GET,POST,PUT,DELETE');
        return res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ ok: false, error: message });
  }
}

// Export with middleware chain: rate limit + require authentication
export default runMiddleware(
  [apiRateLimit, requireAuth],
  handler
);
