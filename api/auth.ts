/**
 * /api/auth — Authentication API routes.
 *
 * POST /api/auth  { action: 'verify' }       — verify Firebase ID token, return user profile + role
 * POST /api/auth  { action: 'personal-link' } — verify personal employee token
 * POST /api/auth  { action: 'set-role' }      — set user role (admin only)
 * GET  /api/auth                               — get current user (from token)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, requireAuth, runMiddleware } from '../server/src/middleware/auth';
import type { AuthenticatedRequest } from '../server/src/middleware/auth';
import { requireRole } from '../server/src/middleware/role-guard';
import { authRateLimit } from '../server/src/middleware/rate-limit';
import { filterResponseByRole } from '../server/src/middleware/response-filter';
import { authService } from '../server/src/services/auth-service';
import { tokenService } from '../server/src/services/token-service';
import type { UserRole } from '../packages/shared/src/constants/roles';
import { ALL_ROLES } from '../packages/shared/src/constants/roles';

async function handler(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  // ─── GET /api/auth — get current user ───
  if (req.method === 'GET') {
    if (!req.auth) {
      res.status(401).json({ ok: false, error: 'Not authenticated' });
      return;
    }

    // If Firebase user, fetch full profile
    if (req.auth.type === 'firebase') {
      const profile = await authService.getUserProfile(req.auth.uid);
      if (profile) {
        res.json({ ok: true, data: profile });
        return;
      }
    }

    // Return auth context directly
    res.json({
      ok: true,
      data: {
        uid: req.auth.uid,
        email: req.auth.email,
        role: req.auth.role,
        employee_id: req.auth.employee_id,
        employee_name: req.auth.employee_name,
      },
    });
    return;
  }

  // ─── POST /api/auth — actions ───
  if (req.method === 'POST') {
    const { action } = req.body ?? {};

    switch (action) {
      case 'verify':
        return handleVerify(req, res);
      case 'personal-link':
        return handlePersonalLink(req, res);
      case 'set-role':
        return handleSetRole(req, res);
      default:
        res.status(400).json({
          ok: false,
          error: 'Invalid action',
          message: 'Supported actions: verify, personal-link, set-role',
        });
        return;
    }
  }

  // ─── Other methods ───
  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ ok: false, error: 'Method not allowed' });
}

/**
 * POST { action: 'verify', id_token: '...' }
 * Verify Firebase ID token and return user profile with role.
 */
async function handleVerify(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  const { id_token } = req.body ?? {};

  if (!id_token || typeof id_token !== 'string') {
    res.status(400).json({
      ok: false,
      error: 'Missing id_token',
      message: 'Provide Firebase ID token in request body',
    });
    return;
  }

  const user = await authService.verifyFirebaseToken(id_token);
  if (!user) {
    res.status(401).json({
      ok: false,
      error: 'Invalid token',
      message: 'Firebase ID token is invalid or expired',
    });
    return;
  }

  res.json({
    ok: true,
    data: {
      uid: user.uid,
      email: user.email,
      role: user.role,
    },
  });
}

/**
 * POST { action: 'personal-link', token: '...' }
 * Verify personal employee token and create session.
 */
async function handlePersonalLink(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  const { token } = req.body ?? {};

  if (!token || typeof token !== 'string') {
    res.status(400).json({
      ok: false,
      error: 'Missing token',
      message: 'Provide personal employee token',
    });
    return;
  }

  const session = await tokenService.verifyToken(token);
  if (!session) {
    res.status(401).json({
      ok: false,
      error: 'Invalid or expired token',
      message: 'Personal token not found or session expired. Contact your administrator.',
    });
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
}

/**
 * POST { action: 'set-role', uid: '...', role: '...' }
 * Set user role (admin only).
 */
async function handleSetRole(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  // Must be authenticated as admin
  if (!req.auth || req.auth.role !== 'admin') {
    res.status(403).json({
      ok: false,
      error: 'Admin access required',
      message: 'Only admins can set user roles',
    });
    return;
  }

  const { uid, role } = req.body ?? {};

  if (!uid || typeof uid !== 'string') {
    res.status(400).json({ ok: false, error: 'Missing uid' });
    return;
  }

  if (!role || !ALL_ROLES.includes(role as UserRole)) {
    res.status(400).json({
      ok: false,
      error: 'Invalid role',
      message: `Valid roles: ${ALL_ROLES.join(', ')}`,
    });
    return;
  }

  const success = await authService.setUserRole(uid, role as UserRole);
  if (!success) {
    res.status(500).json({
      ok: false,
      error: 'Failed to set role',
      message: 'Firebase may not be configured or user not found',
    });
    return;
  }

  res.json({
    ok: true,
    data: { uid, role },
    message: `Role '${role}' set for user ${uid}`,
  });
}

// Export with middleware chain: rate limit + authenticate
export default runMiddleware(
  [authRateLimit, authenticate],
  handler
);
