/**
 * API: /api/timing — timing shifts, scenes, and drafts.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { getTimingRepository } from '../server/src/repositories';
import { requireAuth, runMiddleware } from '../server/src/middleware/auth';
import type { AuthenticatedRequest } from '../server/src/middleware/auth';
import { apiRateLimit } from '../server/src/middleware/rate-limit';

const repo = getTimingRepository();

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { method, query, body } = req;
    const entity = query.entity as string; // 'shifts', 'scenes', 'draft'

    switch (entity) {
      case 'shifts': {
        switch (method) {
          case 'GET': {
            if (query.id) {
              const shift = await repo.findShiftById(query.id as string);
              if (!shift) return res.status(404).json({ ok: false, error: 'Timing shift not found' });
              return res.json({ ok: true, data: shift });
            }
            const shifts = await repo.findAllShifts({
              project_id: query.project_id as string,
              date: query.date as string | undefined,
            });
            return res.json({ ok: true, data: shifts });
          }
          case 'POST': {
            const shift = await repo.createShift({
              id: uuidv4(),
              project_id: body.project_id,
              shift_number: Number(body.shift_number),
              date: body.date,
              address: body.address || '',
              shift_start_plan: body.shift_start_plan || null,
              shift_start_fact: body.shift_start_fact || null,
              shift_end_plan: body.shift_end_plan || null,
              shift_end_fact: body.shift_end_fact || null,
              lunch_start_plan: body.lunch_start_plan || null,
              lunch_start_fact: body.lunch_start_fact || null,
              lunch_end_plan: body.lunch_end_plan || null,
              lunch_end_fact: body.lunch_end_fact || null,
              duration_plan: body.duration_plan || null,
              duration_fact: body.duration_fact || null,
              scenes_plan: body.scenes_plan ? Number(body.scenes_plan) : null,
              scenes_fact: body.scenes_fact ? Number(body.scenes_fact) : null,
              comment: body.comment || null,
            });
            return res.status(201).json({ ok: true, data: shift });
          }
          case 'PUT': {
            const id = query.id as string;
            if (!id) return res.status(400).json({ ok: false, error: 'Missing id' });
            const updated = await repo.updateShift(id, body);
            return res.json({ ok: true, data: updated });
          }
          default:
            return res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
        }
      }

      case 'scenes': {
        switch (method) {
          case 'GET': {
            const scenes = await repo.findScenesByShiftId(query.shift_id as string);
            return res.json({ ok: true, data: scenes });
          }
          case 'POST': {
            const scene = await repo.createScene({
              id: uuidv4(),
              shift_id: body.shift_id,
              date: body.date,
              shift_number: Number(body.shift_number),
              scene_number: body.scene_number,
              rehearsal_start: body.rehearsal_start || null,
              motor_plan: body.motor_plan || null,
              motor_fact: body.motor_fact || null,
              stop_plan: body.stop_plan || null,
              stop_fact: body.stop_fact || null,
              duration_plan: body.duration_plan || null,
              duration_fact: body.duration_fact || null,
              comment: body.comment || null,
            });
            return res.status(201).json({ ok: true, data: scene });
          }
          case 'PUT': {
            const id = query.id as string;
            if (!id) return res.status(400).json({ ok: false, error: 'Missing id' });
            const updated = await repo.updateScene(id, body);
            return res.json({ ok: true, data: updated });
          }
          default:
            return res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
        }
      }

      case 'draft': {
        switch (method) {
          case 'GET': {
            const draft = await repo.getDraft(
              query.project_id as string,
              (query.type || 'shift') as 'shift' | 'scene',
            );
            return res.json({ ok: true, data: draft });
          }
          case 'POST': {
            const saved = await repo.saveDraft({
              id: '',
              project_id: body.project_id,
              type: body.type || 'shift',
              payload: typeof body.payload === 'string'
                ? body.payload
                : JSON.stringify(body.payload),
              updated_at: new Date().toISOString(),
            });
            return res.json({ ok: true, data: saved });
          }
          default:
            return res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
        }
      }

      default:
        return res.status(400).json({
          ok: false,
          error: 'Missing entity query param. Use ?entity=shifts|scenes|draft',
        });
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
