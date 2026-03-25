/**
 * Token Service — personal employee link tokens.
 *
 * Replaces Google Apps Script ?emp=P001&sig=... links.
 * Works WITHOUT Firebase — tokens are stored in _employees sheet.
 *
 * Flow:
 * 1. Admin generates personal token for employee
 * 2. Employee opens link: /form/{token}
 * 3. Backend verifies token → returns employee data
 * 4. Creates a 24-hour session for the employee
 */

import { v4 as uuidv4 } from 'uuid';
import type { EmployeeSession } from '@kinotabel/shared';

/** Session TTL: 24 hours in milliseconds */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** In-memory session store (token → session) */
const activeSessions = new Map<string, EmployeeSession>();

/** Cleanup interval for expired sessions */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, session] of activeSessions) {
      if (new Date(session.expires_at).getTime() < now) {
        activeSessions.delete(key);
      }
    }
  }, 60 * 60 * 1000); // cleanup every hour
}

/**
 * Interface for looking up employee by personal token from DB.
 * Injected to avoid circular dependency with repositories.
 */
export interface EmployeeLookup {
  findByPersonalToken(token: string): Promise<{
    employee_id: string;
    employee_name: string;
    project_id: string;
  } | null>;

  updatePersonalToken(employeeId: string, newToken: string): Promise<boolean>;
}

let employeeLookup: EmployeeLookup | null = null;

/**
 * Register the employee lookup implementation.
 * Called during app initialization when repositories are ready.
 */
export function registerEmployeeLookup(lookup: EmployeeLookup): void {
  employeeLookup = lookup;
  startCleanup();
}

/**
 * Generate a new personal token for an employee.
 * Stores the token in _employees sheet via repository.
 */
async function generatePersonalToken(employeeId: string): Promise<string | null> {
  if (!employeeLookup) {
    console.error('[token-service] Employee lookup not registered');
    return null;
  }

  const token = uuidv4();
  const success = await employeeLookup.updatePersonalToken(employeeId, token);

  if (!success) {
    console.error(`[token-service] Failed to save token for employee ${employeeId}`);
    return null;
  }

  console.log(`[token-service] Generated new token for employee ${employeeId}`);
  return token;
}

/**
 * Verify a personal token and create a temporary session.
 * Returns employee data if token is valid, null otherwise.
 */
async function verifyToken(token: string): Promise<EmployeeSession | null> {
  // 1. Check if there's already an active session for this token
  const existingSession = activeSessions.get(token);
  if (existingSession) {
    const now = Date.now();
    if (new Date(existingSession.expires_at).getTime() > now) {
      return existingSession;
    }
    // Session expired, remove it
    activeSessions.delete(token);
  }

  // 2. Look up token in DB
  if (!employeeLookup) {
    console.error('[token-service] Employee lookup not registered');
    return null;
  }

  const employee = await employeeLookup.findByPersonalToken(token);
  if (!employee) {
    return null;
  }

  // 3. Create a new session
  const session: EmployeeSession = {
    employee_id: employee.employee_id,
    employee_name: employee.employee_name,
    project_id: employee.project_id,
    token,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };

  activeSessions.set(token, session);
  return session;
}

/**
 * Regenerate token for an employee (invalidates old token).
 */
async function regenerateToken(employeeId: string): Promise<string | null> {
  // Remove any existing sessions for this employee
  for (const [key, session] of activeSessions) {
    if (session.employee_id === employeeId) {
      activeSessions.delete(key);
    }
  }

  return generatePersonalToken(employeeId);
}

/**
 * Invalidate all sessions for an employee.
 */
function invalidateSessions(employeeId: string): void {
  for (const [key, session] of activeSessions) {
    if (session.employee_id === employeeId) {
      activeSessions.delete(key);
    }
  }
}

/** Get count of active sessions (for monitoring) */
function getActiveSessionCount(): number {
  return activeSessions.size;
}

export const tokenService = {
  generatePersonalToken,
  verifyToken,
  regenerateToken,
  invalidateSessions,
  getActiveSessionCount,
};
