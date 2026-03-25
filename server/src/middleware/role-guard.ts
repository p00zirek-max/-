/**
 * Role-based access control middleware.
 *
 * Implements the access matrix from DECISIONS.md D-015, D-016:
 *
 * | Resource           | admin | producer | director | ams          | accounting | employee   |
 * |--------------------|-------|----------|----------|--------------|------------|------------|
 * | Employees CRUD     | full  | read     | read     | read         | read       | none       |
 * | Shifts create      | yes   | no       | no       | yes          | no         | own only   |
 * | Shifts edit        | yes   | no       | no       | yes(unlocked)| no         | no         |
 * | Shifts lock        | yes   | no       | no       | yes          | no         | no         |
 * | Shifts unlock      | yes   | no       | no       | no           | no         | no         |
 * | Shifts delete      | yes   | no       | no       | no           | no         | no         |
 * | Extras             | full  | read     | read     | full         | read       | none       |
 * | Timing             | full  | read     | read     | full         | read       | none       |
 * | Reports            | yes   | yes      | yes      | yes          | yes        | no         |
 * | Export             | yes   | yes      | yes      | yes          | yes        | no         |
 * | User management    | yes   | no       | no       | no           | no         | no         |
 */

import type { VercelResponse } from '@vercel/node';
import type { AuthenticatedRequest } from './auth';
import type { UserRole } from '@kinotabel/shared';

type NextFn = () => void | Promise<void>;
type MiddlewareFn = (req: AuthenticatedRequest, res: VercelResponse, next: NextFn) => void | Promise<void>;

/**
 * Create middleware that allows only specified roles.
 *
 * Usage:
 *   requireRole('admin', 'ams')       — only admin and AMS
 *   requireRole('admin')              — only admin
 *   requireRole(...REPORT_ROLES)      — any role that can view reports
 */
export function requireRole(...allowedRoles: UserRole[]): MiddlewareFn {
  return async (req, res, next) => {
    if (!req.auth) {
      res.status(401).json({
        ok: false,
        error: 'Authentication required',
      });
      return;
    }

    const userRole = req.auth.role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        ok: false,
        error: 'Insufficient permissions',
        message: `Role '${userRole}' does not have access to this resource. Required: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    return next();
  };
}

// ─── Pre-built role guards for common access patterns ───

/** Full access — only admin */
export const adminOnly = requireRole('admin');

/** Data entry — admin + AMS */
export const dataEntry = requireRole('admin', 'ams');

/** Read all data — admin, producer, director, ams, accounting */
export const readAll = requireRole('admin', 'producer', 'director', 'ams', 'accounting');

/** Reports and export — all roles except employee */
export const reportAccess = requireRole('admin', 'producer', 'director', 'ams', 'accounting');

/** Employee management — admin only for CRUD, others can read */
export const employeeWrite = requireRole('admin');
export const employeeRead = requireRole('admin', 'producer', 'director', 'ams', 'accounting');

// ─── Resource-specific permission checks ───

export type ResourceAction =
  | 'employees:read' | 'employees:write'
  | 'shifts:create' | 'shifts:edit' | 'shifts:lock' | 'shifts:unlock' | 'shifts:delete'
  | 'extras:read' | 'extras:write'
  | 'timing:read' | 'timing:write'
  | 'reports:read' | 'export:read'
  | 'users:manage' | 'settings:manage';

/**
 * Check if a role has permission for a specific action.
 * Can be used in handler code for fine-grained checks.
 */
export function hasPermission(role: UserRole, action: ResourceAction): boolean {
  return ACCESS_MATRIX[action]?.includes(role) ?? false;
}

const ACCESS_MATRIX: Record<ResourceAction, readonly UserRole[]> = {
  'employees:read':   ['admin', 'producer', 'director', 'ams', 'accounting'],
  'employees:write':  ['admin'],

  'shifts:create':    ['admin', 'ams', 'employee'],
  'shifts:edit':      ['admin', 'ams'],
  'shifts:lock':      ['admin', 'ams'],
  'shifts:unlock':    ['admin'],
  'shifts:delete':    ['admin'],

  'extras:read':      ['admin', 'producer', 'director', 'ams', 'accounting'],
  'extras:write':     ['admin', 'ams'],

  'timing:read':      ['admin', 'producer', 'director', 'ams', 'accounting'],
  'timing:write':     ['admin', 'ams'],

  'reports:read':     ['admin', 'producer', 'director', 'ams', 'accounting'],
  'export:read':      ['admin', 'producer', 'director', 'ams', 'accounting'],

  'users:manage':     ['admin'],
  'settings:manage':  ['admin'],
};

/**
 * Middleware that checks resource-level permission.
 *
 * Usage:
 *   requirePermission('shifts:create')
 */
export function requirePermission(action: ResourceAction): MiddlewareFn {
  return async (req, res, next) => {
    if (!req.auth) {
      res.status(401).json({ ok: false, error: 'Authentication required' });
      return;
    }

    if (!hasPermission(req.auth.role, action)) {
      res.status(403).json({
        ok: false,
        error: 'Insufficient permissions',
        message: `Role '${req.auth.role}' cannot perform '${action}'`,
      });
      return;
    }

    return next();
  };
}
