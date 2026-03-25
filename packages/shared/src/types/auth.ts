import type { UserRole } from '../constants/roles';

/** Authenticated user context attached to requests */
export interface AuthUser {
  uid: string;
  email: string | null;
  role: UserRole;
}

/** Employee session from personal token */
export interface EmployeeSession {
  employee_id: string;
  employee_name: string;
  project_id: string;
  token: string;
  expires_at: string; // ISO datetime
}

/** Auth verification response */
export interface AuthVerifyResponse {
  user: AuthUser;
  token_expires_at: number; // unix timestamp
}

/** Personal link verification response */
export interface PersonalLinkResponse {
  employee_id: string;
  employee_name: string;
  project_id: string;
  session_token: string;
  expires_at: string;
}

/** Set role request body */
export interface SetRoleRequest {
  uid: string;
  role: UserRole;
}
