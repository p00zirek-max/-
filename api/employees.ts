/**
 * API: /api/employees — employee and position management.
 * Vercel serverless function.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { getEmployeeRepository } from '../server/src/repositories';
import { requireAuth, runMiddleware } from '../server/src/middleware/auth';
import type { AuthenticatedRequest } from '../server/src/middleware/auth';
import { apiRateLimit } from '../server/src/middleware/rate-limit';
import { createFilteredResponse } from '../server/src/middleware/response-filter';
import type { EmployeeCategory, PaymentType } from '@kinotabel/shared';
import type { RoundingMode, ReportBlock } from '@kinotabel/shared';

const repo = getEmployeeRepository();

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { method, query, body } = req;
    const send = createFilteredResponse(req.auth?.role ?? 'employee');

    switch (method) {
      case 'GET': {
        if (query.id) {
          const employee = await repo.findByIdWithPositions(query.id as string);
          if (!employee) return res.status(404).json({ ok: false, error: 'Employee not found' });
          return res.json({ ok: true, data: employee });
        }

        const employees = await repo.findAll({
          project_id: query.project_id as string,
          category: query.category as EmployeeCategory | undefined,
          is_active: query.is_active !== undefined
            ? query.is_active === 'true'
            : undefined,
          report_block: query.block as string | undefined,
        });
        return res.json({ ok: true, data: employees, meta: { total: employees.length } });
      }

      case 'POST': {
        // Check if this is a position add
        if (query.action === 'add-position') {
          const position = {
            id: uuidv4(),
            employee_id: body.employee_id,
            position: body.position,
            report_block: (body.report_block || 'P') as ReportBlock,
            shift_rate: Number(body.shift_rate) || 0,
            overtime_hourly_rate: Number(body.overtime_hourly_rate) || 0,
            km_rate: Number(body.km_rate) || 0,
            unit_rate: Number(body.unit_rate) || 0,
            fk_percent: Number(body.fk_percent) || 0,
            shift_hours: Number(body.shift_hours) || 12,
            rounding: (body.rounding || 'hour') as RoundingMode,
            night_shift_rate: body.night_shift_rate ? Number(body.night_shift_rate) : null,
            night_overtime_rate: body.night_overtime_rate ? Number(body.night_overtime_rate) : null,
            night_shift_hours: body.night_shift_hours ? Number(body.night_shift_hours) : null,
            break_hours: Number(body.break_hours) || 1,
            is_active: true,
          };
          const created = await repo.addPosition(position);
          return res.status(201).json({ ok: true, data: created });
        }

        // Create employee
        const employee = await repo.create({
          id: body.id || uuidv4(),
          project_id: body.project_id,
          name: body.name,
          category: (body.category || 'crew') as EmployeeCategory,
          telegram_chat_id: body.telegram_chat_id || null,
          personal_token: uuidv4(),
          payment_type: (body.payment_type || 'per_shift') as PaymentType,
          accord_amount: body.accord_amount ? Number(body.accord_amount) : null,
          is_active: true,
          attached_from: body.attached_from || null,
          attached_to: body.attached_to || null,
        });
        return res.status(201).json({ ok: true, data: employee });
      }

      case 'PUT': {
        const id = query.id as string;
        if (!id) return res.status(400).json({ ok: false, error: 'Missing employee id' });

        // Check if updating a position
        if (query.position_id) {
          const updated = await repo.updatePosition(
            query.position_id as string,
            body,
          );
          return res.json({ ok: true, data: updated });
        }

        const updated = await repo.update(id, body);
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
