/**
 * Authentication middleware.
 *
 * Supports two auth methods:
 * 1. Firebase ID token in Authorization: Bearer <token> header
 * 2. Personal employee token in X-Personal-Token header or ?token= query param
 *
 * Attaches user info to request for downstream middleware/handlers.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken } from '../services/auth-service';
import { tokenService } from '../services/token-service';
import { isFirebaseConfigured } from '../config/firebase';
import type { UserRole } from '@kinotabel/shared';

/** Extended request with auth context */
export interface AuthenticatedRequest extends VercelRequest {
  auth?: {
    type: 'firebase' | 'personal_token';
    uid: string;
    email: string | null;
    role: UserRole;
    employee_id?: string;
    employee_name?: string;
    project_id?: string;
  };
}

type NextFn = () => void | Promise<void>;
type MiddlewareFn = (req: AuthenticatedRequest, res: VercelResponse, next: NextFn) => void | Promise<void>;

/**
 * Extract Bearer token from Authorization header.
 */
function extractBearerToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1] || null;
}

/**
 * Extract personal token from header or query.
 */
function extractPersonalToken(req: VercelRequest): string | null {
  // Header first
  const headerToken = req.headers['x-personal-token'] as string | undefined;
  if (headerToken) return headerToken;

  // Query param fallback
  const queryToken = req.query?.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) return queryToken;

  return null;
}

/**
 * Main auth middleware.
 * Tries Firebase token first, then personal token.
 * Sets req.auth if authentication succeeds.
 *
 * Does NOT block unauthenticated requests — use requireAuth() for that.
 */
export const authenticate: MiddlewareFn = async (req, res, next) => {
  // 1. Try Firebase Bearer token
  const bearerToken = extractBearerToken(req);
  if (bearerToken) {
    const user = await verifyFirebaseToken(bearerToken);
    if (user) {
      req.auth = {
        type: 'firebase',
        uid: user.uid,
        email: user.email,
        role: user.role,
      };
      return next();
    }
    // Token present but invalid — still try personal token below
  }

  // 2. Try personal employee token
  const personalToken = extractPersonalToken(req);
  if (personalToken) {
    const session = await tokenService.verifyToken(personalToken);
    if (session) {
      req.auth = {
        type: 'personal_token',
        uid: `employee:${session.employee_id}`,
        email: null,
        role: 'employee',
        employee_id: session.employee_id,
        employee_name: session.employee_name,
        project_id: session.project_id,
      };
      return next();
    }
  }

  // 3. No valid auth — proceed without auth context
  return next();
};

/**
 * Middleware that requires authentication.
 * Returns 401 if not authenticated.
 */
export const requireAuth: MiddlewareFn = async (req, res, next) => {
  await authenticate(req, res, async () => {
    if (!req.auth) {
      res.status(401).json({
        ok: false,
        error: 'Authentication required',
        message: isFirebaseConfigured()
          ? 'Provide a valid Bearer token or personal token'
          : 'Firebase not configured. Use personal token (X-Personal-Token header)',
      });
      return;
    }
    return next();
  });
};

/**
 * Helper to run middleware chain for Vercel serverless functions.
 * Since Vercel doesn't have Express-style middleware, we chain them manually.
 *
 * Usage:
 *   export default runMiddleware(
 *     [authenticate, requireRole('admin', 'ams')],
 *     handler
 *   );
 */
export function runMiddleware(
  middlewares: MiddlewareFn[],
  handler: (req: AuthenticatedRequest, res: VercelResponse) => void | Promise<void>
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req: VercelRequest, res: VercelResponse) => {
    const authReq = req as AuthenticatedRequest;

    let index = 0;
    const next = async (): Promise<void> => {
      if (res.writableEnded) return; // response already sent (e.g., 401)

      if (index < middlewares.length) {
        const mw = middlewares[index++];
        await mw(authReq, res, next);
      } else {
        await handler(authReq, res);
      }
    };

    await next();
  };
}
