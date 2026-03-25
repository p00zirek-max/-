/**
 * API: /api/locations — location management with auto-calculation.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { getLocationRepository } from '../server/src/repositories';
import { calculateLocation } from '../server/src/services/calculation-engine';
import { requireAuth, runMiddleware } from '../server/src/middleware/auth';
import type { AuthenticatedRequest } from '../server/src/middleware/auth';
import { apiRateLimit } from '../server/src/middleware/rate-limit';
import type { RoundingMode } from '@kinotabel/shared';

const repo = getLocationRepository();

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { method, query, body } = req;

    switch (method) {
      case 'GET': {
        if (query.id) {
          const loc = await repo.findById(query.id as string);
          if (!loc) return res.status(404).json({ ok: false, error: 'Location not found' });
          return res.json({ ok: true, data: loc });
        }

        const locations = await repo.findAll({
          project_id: query.project_id as string,
          date: query.date as string | undefined,
          date_from: query.date_from as string | undefined,
          date_to: query.date_to as string | undefined,
        });
        return res.json({ ok: true, data: locations, meta: { total: locations.length } });
      }

      case 'POST': {
        const calc = calculateLocation({
          shift_start: body.shift_start,
          shift_end: body.shift_end,
          shift_rate: Number(body.shift_rate),
          overtime_hourly_rate: Number(body.overtime_hourly_rate),
          shift_hours: Number(body.shift_hours),
          rounding: (body.rounding || 'hour') as RoundingMode,
        });

        const location = await repo.create({
          id: uuidv4(),
          project_id: body.project_id,
          date: body.date,
          address: body.address,
          object_name: body.object_name,
          shift_rate: Number(body.shift_rate),
          overtime_hourly_rate: Number(body.overtime_hourly_rate),
          shift_hours: Number(body.shift_hours),
          rounding: (body.rounding || 'hour') as RoundingMode,
          shift_start: body.shift_start,
          shift_end: body.shift_end,
          overtime_hours: calc.overtime_hours,
          overtime_amount: calc.overtime_amount,
          total_amount: calc.total_amount,
          comment: body.comment || null,
        });
        return res.status(201).json({ ok: true, data: location });
      }

      case 'PUT': {
        const id = query.id as string;
        if (!id) return res.status(400).json({ ok: false, error: 'Missing id' });

        // Recalculate if time fields changed
        const existing = await repo.findById(id);
        if (!existing) return res.status(404).json({ ok: false, error: 'Location not found' });

        const merged = { ...existing, ...body };
        const calc = calculateLocation({
          shift_start: merged.shift_start,
          shift_end: merged.shift_end,
          shift_rate: Number(merged.shift_rate),
          overtime_hourly_rate: Number(merged.overtime_hourly_rate),
          shift_hours: Number(merged.shift_hours),
          rounding: merged.rounding as RoundingMode,
        });

        const updated = await repo.update(id, {
          ...body,
          overtime_hours: calc.overtime_hours,
          overtime_amount: calc.overtime_amount,
          total_amount: calc.total_amount,
        });
        return res.json({ ok: true, data: updated });
      }

      default:
        res.setHeader('Allow', 'GET,POST,PUT');
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
