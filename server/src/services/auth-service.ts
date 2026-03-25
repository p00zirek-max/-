/**
 * Auth Service — Firebase Auth token verification and role management.
 *
 * Falls back gracefully when Firebase is not configured (MVP mode).
 */

import { getFirebaseAuth, isFirebaseConfigured } from '../config/firebase';
import { tokenService } from './token-service';
import type { UserRole, AuthUser, EmployeeSession } from '@kinotabel/shared';

export interface DecodedToken {
  uid: string;
  email?: string;
  role?: UserRole;
}

/**
 * Verify Firebase ID token from client.
 * Returns user info with role from custom claims.
 */
export async function verifyFirebaseToken(idToken: string): Promise<AuthUser | null> {
  const auth = getFirebaseAuth();

  if (!auth) {
    console.warn('[auth-service] Firebase not configured, cannot verify token');
    return null;
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    const role = (decoded.role as UserRole) || 'employee';

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role,
    };
  } catch (err) {
    console.error('[auth-service] Token verification failed:', err);
    return null;
  }
}

/**
 * Get user role from Firebase custom claims.
 */
export async function getUserRole(uid: string): Promise<UserRole | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  try {
    const user = await auth.getUser(uid);
    return (user.customClaims?.role as UserRole) ?? 'employee';
  } catch (err) {
    console.error('[auth-service] Failed to get user role:', err);
    return null;
  }
}

/**
 * Set user role via Firebase custom claims.
 * Only callable by admin.
 */
export async function setUserRole(uid: string, role: UserRole): Promise<boolean> {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.error('[auth-service] Firebase not configured, cannot set role');
    return false;
  }

  try {
    await auth.setCustomUserClaims(uid, { role });
    console.log(`[auth-service] Set role '${role}' for user ${uid}`);
    return true;
  } catch (err) {
    console.error('[auth-service] Failed to set user role:', err);
    return false;
  }
}

/**
 * Verify personal employee token (works WITHOUT Firebase).
 * Looks up token in _employees sheet and creates a temporary session.
 */
export async function verifyPersonalToken(token: string): Promise<EmployeeSession | null> {
  return tokenService.verifyToken(token);
}

/**
 * Get Firebase user profile by UID.
 */
export async function getUserProfile(uid: string): Promise<{
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
} | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  try {
    const user = await auth.getUser(uid);
    const role = (user.customClaims?.role as UserRole) ?? 'employee';

    return {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      role,
    };
  } catch (err) {
    console.error('[auth-service] Failed to get user profile:', err);
    return null;
  }
}

export const authService = {
  verifyFirebaseToken,
  getUserRole,
  setUserRole,
  verifyPersonalToken,
  getUserProfile,
};
