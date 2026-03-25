/**
 * API: /api/shifts — CRUD for shifts.
 * Vercel serverless function.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ShiftService } from '../server/src/services/shift-service';
import { requireAuth, runMiddleware } from '../server/src/middleware/auth';
import type { AuthenticatedRequest } from '../server/src/middleware/auth';
import { requirePermission } from '../server/src/middleware/role-guard';
import { apiRateLimit } from '../server/src/middleware/rate-limit';
import { filterResponseByRole, createFilteredResponse } from '../server/src/middleware/response-filter';
import type { ShiftCoefficient } from '@kinotabel/shared';

const service = new ShiftService();

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { method, query, body } = req;
    const send = createFilteredResponse(req.auth?.role ?? 'employee');

    switch (method) {
      case 'GET': {
        if (query.id) {
          // GET /api/shifts?id=xxx — single shift
          const shift = await service.getShiftById(query.id as string);
          if (!shift) return res.status(404).json({ ok: false, error: 'Shift not found' });
          return res.json({ ok: true, data: shift });
        }

        // GET /api/shifts?project_id=...&date=...&employee_id=...
        const shifts = await service.getShifts({
          project_id: query.project_id as string,
          employee_id: query.employee_id as string | undefined,
          position_id: query.position_id as string | undefined,
          date: query.date as string | undefined,
          date_from: query.date_from as string | undefined,
          date_to: query.date_to as string | undefined,
          months: query.months ? (query.months as string).split(',') : undefined,
        });
        return res.json({ ok: true, data: shifts, meta: { total: shifts.length } });
      }

      case 'POST': {
        if (!body.project_id || !body.employee_id || !body.position_id) {
          return res.status(400).json({
            ok: false,
            error: 'Missing required fields: project_id, employee_id, position_id',
          });
        }

        const shift = await service.createShift({
          project_id: body.project_id,
          employee_id: body.employee_id,
          position_id: body.position_id,
          location_id: body.location_id || null,
          date: body.date,
          shift_start: body.shift_start,
          shift_end: body.shift_end,
          days_in_shift: Number(body.days_in_shift) || 0,
          lunch_current: Boolean(body.lunch_current),
          lunch_late: Boolean(body.lunch_late),
          lunch_none: Boolean(body.lunch_none),
          is_night: Boolean(body.is_night),
          coefficient: Number(body.coefficient) as ShiftCoefficient || 1,
          address: body.address || '',
          overtime_km: Number(body.overtime_km) || 0,
          unit_quantity: Number(body.unit_quantity) || 0,
          comment: body.comment || '',
        });
        return res.status(201).json({ ok: true, data: shift });
      }

      case 'PUT': {
        const id = query.id as string;
        if (!id) return res.status(400).json({ ok: false, error: 'Missing shift id' });

        const updated = await service.updateShift(id, body);
        return res.json({ ok: true, data: updated });
      }

      case 'DELETE': {
        const deleteId = query.id as string;
        if (!deleteId) return res.status(400).json({ ok: false, error: 'Missing shift id' });

        await service.deleteShift(deleteId);
        return res.json({ ok: true, data: null });
      }

      default:
        res.setHeader('Allow', 'GET,POST,PUT,DELETE');
        return res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404
      : message.includes('locked') ? 403
      : 500;
    return res.status(status).json({ ok: false, error: message });
  }
}

// Export with middleware chain: rate limit + require authentication
export default runMiddleware(
  [apiRateLimit, requireAuth],
  handler
);
