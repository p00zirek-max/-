/**
 * Google Cloud Functions — single HTTP entry point.
 *
 * Routes incoming requests to the appropriate handler based on URL path.
 * Replaces individual Vercel serverless functions with one unified endpoint.
 *
 * URL mapping:
 *   /api/auth       → auth handler
 *   /api/shifts     → shifts handler
 *   /api/employees  → employees handler
 *   /api/extras     → extras handler
 *   /api/locations  → locations handler
 *   /api/timing     → timing handler
 *   /api/reports    → reports handler
 *   /api/dashboard  → dashboard handler
 *   /api/export     → export handler
 */

import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Services
import { ShiftService } from './services/shift-service';
import { DashboardService } from './services/dashboard-service';
import { ExtrasService } from './services/extras-service';
import { ReportService } from './services/report-service';
import { ProductionReportService } from './services/production-report-service';
import { calculateLocation } from './services/calculation-engine';
import { authService, verifyFirebaseToken } from './services/auth-service';
import { tokenService } from './services/token-service';

// Repositories
import {
  getEmployeeRepository,
  getLocationRepository,
  getTimingRepository,
} from './repositories';

// Middleware helpers (adapted for Cloud Functions — see compat layer below)
import { isFirebaseConfigured } from './config/firebase';

import type { UserRole, EmployeeCategory, PaymentType, RoundingMode, ReportBlock, ShiftCoefficient } from '@kinotabel/shared';
import { ALL_ROLES } from '@kinotabel/shared';

// ─── CORS configuration ─────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  /^https:\/\/[\w-]+\.github\.io$/,           // Any GitHub Pages
  /^http:\/\/localhost(:\d+)?$/,              // Local dev
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,           // Local dev
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
}

function setCorsHeaders(req: Request, res: Response): boolean {
  const origin = req.headers.origin as string | undefined;

  if (isOriginAllowed(origin)) {
    res.set('Access-Control-Allow-Origin', origin!);
  }

  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Personal-Token');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }

  return false;
}

// ─── Auth helpers (adapted from middleware/auth.ts for plain Express) ────────

interface AuthContext {
  type: 'firebase' | 'personal_token';
  uid: string;
  email: string | null;
  role: UserRole;
  employee_id?: string;
  employee_name?: string;
  project_id?: string;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1] || null;
}

function extractPersonalToken(req: Request): string | null {
  const headerToken = req.headers['x-personal-token'] as string | undefined;
  if (headerToken) return headerToken;
  const queryToken = req.query?.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) return queryToken;
  return null;
}

async function resolveAuth(req: Request): Promise<AuthContext | null> {
  // 1. Try Firebase Bearer token
  const bearerToken = extractBearerToken(req);
  if (bearerToken) {
    const user = await verifyFirebaseToken(bearerToken);
    if (user) {
      return {
        type: 'firebase',
        uid: user.uid,
        email: user.email,
        role: user.role,
      };
    }
  }

  // 2. Try personal employee token
  const personalToken = extractPersonalToken(req);
  if (personalToken) {
    const session = await tokenService.verifyToken(personalToken);
    if (session) {
      return {
        type: 'personal_token',
        uid: `employee:${session.employee_id}`,
        email: null,
        role: 'employee',
        employee_id: session.employee_id,
        employee_name: session.employee_name,
        project_id: session.project_id,
      };
    }
  }

  return null;
}

function requireAuthentication(auth: AuthContext | null, res: Response): auth is AuthContext {
  if (!auth) {
    res.status(401).json({
      ok: false,
      error: 'Authentication required',
      message: isFirebaseConfigured()
        ? 'Provide a valid Bearer token or personal token'
        : 'Firebase not configured. Use personal token (X-Personal-Token header)',
    });
    return false;
  }
  return true;
}

function requireRole(auth: AuthContext, res: Response, ...allowedRoles: UserRole[]): boolean {
  if (!allowedRoles.includes(auth.role)) {
    res.status(403).json({
      ok: false,
      error: 'Insufficient permissions',
      message: `Role '${auth.role}' does not have access. Required: ${allowedRoles.join(', ')}`,
    });
    return false;
  }
  return true;
}

// ─── Rate limiting (simple in-memory, per-instance) ─────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

function rateLimitByAuth(auth: AuthContext | null, req: Request, prefix: string, max: number, windowMs: number): boolean {
  const uid = auth?.uid;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers['x-real-ip'] as string
    || 'unknown';
  const key = `${prefix}:${uid || `ip:${ip}`}`;
  return checkRateLimit(key, max, windowMs);
}

// ─── Singleton services & repositories ──────────────────────────────────────

const shiftService = new ShiftService();
const dashboardService = new DashboardService();
const extrasService = new ExtrasService();
const reportService = new ReportService();
const productionService = new ProductionReportService();
const employeeRepo = getEmployeeRepository();
const locationRepo = getLocationRepository();
const timingRepo = getTimingRepository();

// ─── Route handlers ─────────────────────────────────────────────────────────

async function handleAuth(req: Request, res: Response, auth: AuthContext | null): Promise<void> {
  // Auth endpoint has its own rate limit: 20 per 15 min
  if (!rateLimitByAuth(auth, req, 'auth', 20, 15 * 60 * 1000)) {
    res.status(429).json({ ok: false, error: 'Too many authentication attempts. Please wait 15 minutes.' });
    return;
  }

  if (req.method === 'GET') {
    if (!auth) {
      res.status(401).json({ ok: false, error: 'Not authenticated' });
      return;
    }
    if (auth.type === 'firebase') {
      const profile = await authService.getUserProfile(auth.uid);
      if (profile) { res.json({ ok: true, data: profile }); return; }
    }
    res.json({
      ok: true,
      data: {
        uid: auth.uid,
        email: auth.email,
        role: auth.role,
        employee_id: auth.employee_id,
        employee_name: auth.employee_name,
      },
    });
    return;
  }

  if (req.method === 'POST') {
    const { action } = req.body ?? {};

    switch (action) {
      case 'verify': {
        const { id_token } = req.body ?? {};
        if (!id_token || typeof id_token !== 'string') {
          res.status(400).json({ ok: false, error: 'Missing id_token' });
          return;
        }
        const user = await authService.verifyFirebaseToken(id_token);
        if (!user) {
          res.status(401).json({ ok: false, error: 'Invalid token' });
          return;
        }
        res.json({ ok: true, data: { uid: user.uid, email: user.email, role: user.role } });
        return;
      }

      case 'personal-link': {
        const { token } = req.body ?? {};
        if (!token || typeof token !== 'string') {
          res.status(400).json({ ok: false, error: 'Missing token' });
          return;
        }
        const session = await tokenService.verifyToken(token);
        if (!session) {
          res.status(401).json({ ok: false, error: 'Invalid or expired token' });
          return;
        }
        res.json({
          ok: true,
          data: {
            employee_id: session.employee_id,
            employee_name: session.employee_name,
            project_id: session.project_id,
            session_token: session.token,
            expires_at: session.expires_at,
          },
        });
        return;
      }

      case 'set-role': {
        if (!auth || auth.role !== 'admin') {
          res.status(403).json({ ok: false, error: 'Admin access required' });
          return;
        }
        const { uid, role } = req.body ?? {};
        if (!uid || typeof uid !== 'string') {
          res.status(400).json({ ok: false, error: 'Missing uid' });
          return;
        }
        if (!role || !ALL_ROLES.includes(role as UserRole)) {
          res.status(400).json({ ok: false, error: 'Invalid role' });
          return;
        }
        const success = await authService.setUserRole(uid, role as UserRole);
        if (!success) {
          res.status(500).json({ ok: false, error: 'Failed to set role' });
          return;
        }
        res.json({ ok: true, data: { uid, role } });
        return;
      }

      default:
        res.status(400).json({ ok: false, error: 'Invalid action. Use: verify, personal-link, set-role' });
        return;
    }
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ ok: false, error: 'Method not allowed' });
}

async function handleShifts(req: Request, res: Response, auth: AuthContext): Promise<void> {
  const { method, query, body } = req;

  switch (method) {
    case 'GET': {
      if (query.id) {
        const shift = await shiftService.getShiftById(query.id as string);
        if (!shift) { res.status(404).json({ ok: false, error: 'Shift not found' }); return; }
        res.json({ ok: true, data: shift });
        return;
      }
      const shifts = await shiftService.getShifts({
        project_id: query.project_id as string,
        employee_id: query.employee_id as string | undefined,
        position_id: query.position_id as string | undefined,
        date: query.date as string | undefined,
        date_from: query.date_from as string | undefined,
        date_to: query.date_to as string | undefined,
        months: query.months ? (query.months as string).split(',') : undefined,
      });
      res.json({ ok: true, data: shifts, meta: { total: shifts.length } });
      return;
    }

    case 'POST': {
      if (!body.project_id || !body.employee_id || !body.position_id) {
        res.status(400).json({ ok: false, error: 'Missing required fields: project_id, employee_id, position_id' });
        return;
      }
      const shift = await shiftService.createShift({
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
      res.status(201).json({ ok: true, data: shift });
      return;
    }

    case 'PUT': {
      const id = query.id as string;
      if (!id) { res.status(400).json({ ok: false, error: 'Missing shift id' }); return; }
      const updated = await shiftService.updateShift(id, body);
      res.json({ ok: true, data: updated });
      return;
    }

    case 'DELETE': {
      const deleteId = query.id as string;
      if (!deleteId) { res.status(400).json({ ok: false, error: 'Missing shift id' }); return; }
      await shiftService.deleteShift(deleteId);
      res.json({ ok: true, data: null });
      return;
    }

    default:
      res.setHeader('Allow', 'GET,POST,PUT,DELETE');
      res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
  }
}

async function handleEmployees(req: Request, res: Response, auth: AuthContext): Promise<void> {
  const { method, query, body } = req;

  switch (method) {
    case 'GET': {
      if (query.id) {
        const employee = await employeeRepo.findByIdWithPositions(query.id as string);
        if (!employee) { res.status(404).json({ ok: false, error: 'Employee not found' }); return; }
        res.json({ ok: true, data: employee });
        return;
      }
      const employees = await employeeRepo.findAll({
        project_id: query.project_id as string,
        category: query.category as EmployeeCategory | undefined,
        is_active: query.is_active !== undefined ? query.is_active === 'true' : undefined,
        report_block: query.block as string | undefined,
      });
      res.json({ ok: true, data: employees, meta: { total: employees.length } });
      return;
    }

    case 'POST': {
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
        const created = await employeeRepo.addPosition(position);
        res.status(201).json({ ok: true, data: created });
        return;
      }

      const employee = await employeeRepo.create({
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
      res.status(201).json({ ok: true, data: employee });
      return;
    }

    case 'PUT': {
      const id = query.id as string;
      if (!id) { res.status(400).json({ ok: false, error: 'Missing employee id' }); return; }
      if (query.position_id) {
        const updated = await employeeRepo.updatePosition(query.position_id as string, body);
        res.json({ ok: true, data: updated });
        return;
      }
      const updated = await employeeRepo.update(id, body);
      res.json({ ok: true, data: updated });
      return;
    }

    default:
      res.setHeader('Allow', 'GET,POST,PUT');
      res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
  }
}

async function handleExtras(req: Request, res: Response, auth: AuthContext): Promise<void> {
  const { method, query, body } = req;

  switch (method) {
    case 'GET': {
      if (query.id) {
        const item = await extrasService.getById(query.id as string);
        if (!item) { res.status(404).json({ ok: false, error: 'Extras not found' }); return; }
        res.json({ ok: true, data: item });
        return;
      }
      const items = await extrasService.getAll({
        project_id: query.project_id as string,
        date: query.date as string | undefined,
        date_from: query.date_from as string | undefined,
        date_to: query.date_to as string | undefined,
      });
      res.json({ ok: true, data: items, meta: { total: items.length } });
      return;
    }

    case 'POST': {
      const created = await extrasService.create({
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
      res.status(201).json({ ok: true, data: created });
      return;
    }

    case 'PUT': {
      const id = query.id as string;
      if (!id) { res.status(400).json({ ok: false, error: 'Missing id' }); return; }
      const updated = await extrasService.update(id, body);
      res.json({ ok: true, data: updated });
      return;
    }

    case 'DELETE': {
      const deleteId = query.id as string;
      if (!deleteId) { res.status(400).json({ ok: false, error: 'Missing id' }); return; }
      await extrasService.delete(deleteId);
      res.json({ ok: true, data: null });
      return;
    }

    default:
      res.setHeader('Allow', 'GET,POST,PUT,DELETE');
      res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
  }
}

async function handleLocations(req: Request, res: Response, auth: AuthContext): Promise<void> {
  const { method, query, body } = req;

  switch (method) {
    case 'GET': {
      if (query.id) {
        const loc = await locationRepo.findById(query.id as string);
        if (!loc) { res.status(404).json({ ok: false, error: 'Location not found' }); return; }
        res.json({ ok: true, data: loc });
        return;
      }
      const locations = await locationRepo.findAll({
        project_id: query.project_id as string,
        date: query.date as string | undefined,
        date_from: query.date_from as string | undefined,
        date_to: query.date_to as string | undefined,
      });
      res.json({ ok: true, data: locations, meta: { total: locations.length } });
      return;
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
      const location = await locationRepo.create({
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
      res.status(201).json({ ok: true, data: location });
      return;
    }

    case 'PUT': {
      const id = query.id as string;
      if (!id) { res.status(400).json({ ok: false, error: 'Missing id' }); return; }
      const existing = await locationRepo.findById(id);
      if (!existing) { res.status(404).json({ ok: false, error: 'Location not found' }); return; }
      const merged = { ...existing, ...body };
      const calc = calculateLocation({
        shift_start: merged.shift_start,
        shift_end: merged.shift_end,
        shift_rate: Number(merged.shift_rate),
        overtime_hourly_rate: Number(merged.overtime_hourly_rate),
        shift_hours: Number(merged.shift_hours),
        rounding: merged.rounding as RoundingMode,
      });
      const updated = await locationRepo.update(id, {
        ...body,
        overtime_hours: calc.overtime_hours,
        overtime_amount: calc.overtime_amount,
        total_amount: calc.total_amount,
      });
      res.json({ ok: true, data: updated });
      return;
    }

    default:
      res.setHeader('Allow', 'GET,POST,PUT');
      res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
  }
}

async function handleTiming(req: Request, res: Response, auth: AuthContext): Promise<void> {
  const { method, query, body } = req;
  const entity = query.entity as string;

  switch (entity) {
    case 'shifts': {
      switch (method) {
        case 'GET': {
          if (query.id) {
            const shift = await timingRepo.findShiftById(query.id as string);
            if (!shift) { res.status(404).json({ ok: false, error: 'Timing shift not found' }); return; }
            res.json({ ok: true, data: shift });
            return;
          }
          const shifts = await timingRepo.findAllShifts({
            project_id: query.project_id as string,
            date: query.date as string | undefined,
          });
          res.json({ ok: true, data: shifts });
          return;
        }
        case 'POST': {
          const shift = await timingRepo.createShift({
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
          res.status(201).json({ ok: true, data: shift });
          return;
        }
        case 'PUT': {
          const id = query.id as string;
          if (!id) { res.status(400).json({ ok: false, error: 'Missing id' }); return; }
          const updated = await timingRepo.updateShift(id, body);
          res.json({ ok: true, data: updated });
          return;
        }
        default:
          res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
          return;
      }
    }

    case 'scenes': {
      switch (method) {
        case 'GET': {
          const scenes = await timingRepo.findScenesByShiftId(query.shift_id as string);
          res.json({ ok: true, data: scenes });
          return;
        }
        case 'POST': {
          const scene = await timingRepo.createScene({
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
          res.status(201).json({ ok: true, data: scene });
          return;
        }
        case 'PUT': {
          const id = query.id as string;
          if (!id) { res.status(400).json({ ok: false, error: 'Missing id' }); return; }
          const updated = await timingRepo.updateScene(id, body);
          res.json({ ok: true, data: updated });
          return;
        }
        default:
          res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
          return;
      }
    }

    case 'draft': {
      switch (method) {
        case 'GET': {
          const draft = await timingRepo.getDraft(
            query.project_id as string,
            (query.type || 'shift') as 'shift' | 'scene',
          );
          res.json({ ok: true, data: draft });
          return;
        }
        case 'POST': {
          const saved = await timingRepo.saveDraft({
            id: '',
            project_id: body.project_id,
            type: body.type || 'shift',
            payload: typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload),
            updated_at: new Date().toISOString(),
          });
          res.json({ ok: true, data: saved });
          return;
        }
        default:
          res.status(405).json({ ok: false, error: `Method ${method} not allowed` });
          return;
      }
    }

    default:
      res.status(400).json({ ok: false, error: 'Missing entity query param. Use ?entity=shifts|scenes|draft' });
  }
}

async function handleReports(req: Request, res: Response, auth: AuthContext): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: `Method ${req.method} not allowed` });
    return;
  }

  // Reports require elevated role
  if (!requireRole(auth, res, 'admin', 'producer', 'director', 'ams', 'accounting')) return;

  const { query } = req;
  const type = query.type as string;
  const projectId = query.project_id as string;

  if (!projectId) {
    res.status(400).json({ ok: false, error: 'Missing project_id' });
    return;
  }

  switch (type) {
    case 'summary': {
      const report = await reportService.getSummaryReport({
        project_id: projectId,
        employee_ids: query.employee_ids ? (query.employee_ids as string).split(',') : undefined,
        position_ids: query.position_ids ? (query.position_ids as string).split(',') : undefined,
        date_from: query.date_from as string | undefined,
        date_to: query.date_to as string | undefined,
        months: query.months ? (query.months as string).split(',') : undefined,
      });
      res.json({ ok: true, data: report });
      return;
    }
    case 'individual': {
      const employeeId = query.employee_id as string;
      if (!employeeId) { res.status(400).json({ ok: false, error: 'Missing employee_id' }); return; }
      const report = await reportService.getIndividualReport(projectId, employeeId);
      res.json({ ok: true, data: report });
      return;
    }
    case 'by-position': {
      const report = await reportService.getByPositionReport(projectId);
      res.json({ ok: true, data: report });
      return;
    }
    case 'production': {
      const date = query.date as string;
      if (!date) { res.status(400).json({ ok: false, error: 'Missing date' }); return; }
      const report = await productionService.getProductionReport(projectId, date);
      res.json({ ok: true, data: report });
      return;
    }
    default:
      res.status(400).json({ ok: false, error: 'Missing or invalid type. Use: summary, individual, by-position, production' });
  }
}

async function handleDashboard(req: Request, res: Response, auth: AuthContext): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: `Method ${req.method} not allowed` });
    return;
  }

  // Dashboard requires elevated role
  if (!requireRole(auth, res, 'admin', 'producer', 'director', 'ams', 'accounting')) return;

  const { query } = req;
  const projectId = query.project_id as string;
  if (!projectId) {
    res.status(400).json({ ok: false, error: 'Missing project_id' });
    return;
  }

  const overview = await dashboardService.getOverview(
    projectId,
    query.date_from as string | undefined,
    query.date_to as string | undefined,
  );
  res.json({ ok: true, data: overview });
}

async function handleExport(req: Request, res: Response, auth: AuthContext): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: `Method ${req.method} not allowed` });
    return;
  }

  // Export requires elevated role
  if (!requireRole(auth, res, 'admin', 'producer', 'director', 'ams', 'accounting')) return;

  // Stricter rate limit for exports: 10/hour
  if (!rateLimitByAuth(auth, req, 'export', 10, 60 * 60 * 1000)) {
    res.status(429).json({ ok: false, error: 'Too many export requests. Limit: 10/hour.' });
    return;
  }

  const { query } = req;
  const projectId = query.project_id as string;
  if (!projectId) {
    res.status(400).json({ ok: false, error: 'Missing project_id' });
    return;
  }

  const XLSX = await import('xlsx');

  const report = await reportService.getSummaryReport({
    project_id: projectId,
    employee_ids: query.employee_ids ? (query.employee_ids as string).split(',') : undefined,
    position_ids: query.position_ids ? (query.position_ids as string).split(',') : undefined,
    date_from: query.date_from as string | undefined,
    date_to: query.date_to as string | undefined,
    months: query.months ? (query.months as string).split(',') : undefined,
  });

  const wsData = [
    ['ФИО', 'Должность', 'Блок', 'ФК%',
      'Цена смены', 'Цена переработки', 'Цена км', 'Цена шт',
      'Кол-во смен', 'Кол-во шт', 'Переработка, ч', 'Пробег, км',
      'Сумма смен', 'Сумма переработки', 'Сумма км', 'Сумма шт',
      'Итого', 'Итого с ФК'],
    ...report.rows.map((r: any) => [
      r.employee_name, r.position, r.report_block, r.fk_percent,
      r.shift_rate, r.overtime_hourly_rate, r.km_rate, r.unit_rate,
      r.shift_count, r.unit_count, r.overtime_hours_total, r.km_total,
      r.shifts_total, r.overtime_total, r.km_total_amount, r.units_total,
      r.grand_total, r.grand_total_with_fk,
    ]),
    [],
    ['ИТОГО', '', '', '', '', '', '', '',
      report.totals.shift_count, '', '', '',
      '', '', '', '',
      report.totals.grand_total, report.totals.grand_total_with_fk],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 8 }, { wch: 6 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Сводный отчёт');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', 'attachment; filename="report.xlsx"');
  res.send(buffer);
}

// ─── Main entry point ───────────────────────────────────────────────────────

/**
 * Single HTTP Cloud Function entry point.
 * Export this as `api` for gcloud deployment:
 *   --entry-point api
 */
export async function api(req: Request, res: Response): Promise<void> {
  // CORS
  if (setCorsHeaders(req, res)) return;

  // Parse route from URL path: /api/<route>
  // Cloud Functions URL: https://REGION-PROJECT.cloudfunctions.net/kinotabel-api/api/shifts
  // The function name is "kinotabel-api", so req.path starts from after the function name.
  const path = req.path; // e.g., "/api/shifts" or "/shifts"
  const route = path.replace(/^\/api/, '').replace(/^\//, '').split('/')[0] || '';

  try {
    // Resolve authentication once for all routes
    const auth = await resolveAuth(req);

    // Auth endpoint is special — does not require auth for all actions
    if (route === 'auth') {
      await handleAuth(req, res, auth);
      return;
    }

    // All other routes require authentication
    if (!requireAuthentication(auth, res)) return;

    // Rate limit: 100 req/min for general API
    if (!rateLimitByAuth(auth, req, 'api', 100, 60 * 1000)) {
      res.status(429).json({ ok: false, error: 'Too many API requests. Limit: 100/min.' });
      return;
    }

    switch (route) {
      case 'shifts':
        await handleShifts(req, res, auth);
        break;
      case 'employees':
        await handleEmployees(req, res, auth);
        break;
      case 'extras':
        await handleExtras(req, res, auth);
        break;
      case 'locations':
        await handleLocations(req, res, auth);
        break;
      case 'timing':
        await handleTiming(req, res, auth);
        break;
      case 'reports':
        await handleReports(req, res, auth);
        break;
      case 'dashboard':
        await handleDashboard(req, res, auth);
        break;
      case 'export':
        await handleExport(req, res, auth);
        break;
      default:
        res.status(404).json({
          ok: false,
          error: 'Route not found',
          message: `Unknown route: ${route}. Available: auth, shifts, employees, extras, locations, timing, reports, dashboard, export`,
        });
    }
  } catch (err: unknown) {
    console.error('Cloud Function error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404
      : message.includes('locked') ? 403
      : 500;
    res.status(status).json({ ok: false, error: message });
  }
}
