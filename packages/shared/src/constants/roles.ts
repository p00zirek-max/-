/**
 * User roles in the system.
 * See DECISIONS.md D-015, D-016 for details.
 */
export const ROLES = {
  ADMIN: 'admin',
  PRODUCER: 'producer',
  DIRECTOR: 'director',
  AMS: 'ams',
  ACCOUNTING: 'accounting',
  EMPLOYEE: 'employee',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

/** All valid role values */
export const ALL_ROLES: readonly UserRole[] = Object.values(ROLES);

/** Roles that can see all financial amounts */
export const FINANCIAL_VIEW_ROLES: readonly UserRole[] = [
  ROLES.ADMIN,
  ROLES.PRODUCER,
  ROLES.DIRECTOR,
  ROLES.ACCOUNTING,
];

/** Roles that can create/edit operational data (shifts, extras, timing) */
export const OPERATIONAL_ROLES: readonly UserRole[] = [
  ROLES.ADMIN,
  ROLES.AMS,
];

/** Roles that can view reports and export */
export const REPORT_ROLES: readonly UserRole[] = [
  ROLES.ADMIN,
  ROLES.PRODUCER,
  ROLES.DIRECTOR,
  ROLES.AMS,
  ROLES.ACCOUNTING,
];
