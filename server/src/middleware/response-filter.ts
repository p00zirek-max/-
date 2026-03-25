/**
 * Response field filter middleware.
 *
 * Strips sensitive fields from API responses based on user role.
 * Protects the calculation engine — rates, formulas, and FK% are hidden
 * from roles that shouldn't see them.
 *
 * Field visibility:
 * - admin      → sees everything (rates, FK%, formulas context)
 * - producer   → sees amounts but not rate breakdowns
 * - director   → sees amounts but not rate breakdowns
 * - ams        → sees shift prices but not FK% details
 * - accounting → sees totals but not rate breakdowns
 * - employee   → sees only own totals (shift_amount, total_amount)
 */

import type { UserRole } from '@kinotabel/shared';

/** Fields that are sensitive / role-restricted */
const SENSITIVE_FIELDS = {
  /** Rate details — only admin sees these */
  rateDetails: [
    'shift_rate',
    'overtime_hourly_rate',
    'km_rate',
    'unit_rate',
    'night_shift_rate',
    'night_overtime_rate',
    'night_shift_hours',
    'fk_percent',
    'accord_amount',
  ],

  /** Amount breakdowns — hidden from employee */
  amountBreakdowns: [
    'overtime_amount',
    'km_amount',
    'unit_amount',
    'total_with_fk',
  ],

  /** FK-related fields — only admin */
  fkDetails: [
    'fk_percent',
    'total_with_fk',
  ],

  /** Internal/system fields — never exposed */
  internal: [
    'personal_token', // never leak employee tokens
  ],
} as const;

/** Fields to REMOVE per role (everything else passes through) */
const FIELDS_TO_STRIP: Record<UserRole, readonly string[]> = {
  admin: [
    ...SENSITIVE_FIELDS.internal,
  ],
  producer: [
    ...SENSITIVE_FIELDS.rateDetails,
    ...SENSITIVE_FIELDS.internal,
  ],
  director: [
    ...SENSITIVE_FIELDS.rateDetails,
    ...SENSITIVE_FIELDS.internal,
  ],
  ams: [
    ...SENSITIVE_FIELDS.fkDetails,
    ...SENSITIVE_FIELDS.internal,
    // AMS can see shift prices (shift_rate, overtime_hourly_rate) but not FK%
    'accord_amount',
  ],
  accounting: [
    ...SENSITIVE_FIELDS.rateDetails,
    ...SENSITIVE_FIELDS.internal,
  ],
  employee: [
    ...SENSITIVE_FIELDS.rateDetails,
    ...SENSITIVE_FIELDS.amountBreakdowns,
    ...SENSITIVE_FIELDS.internal,
  ],
};

/**
 * Strip sensitive fields from a single object.
 */
function stripFields<T extends Record<string, unknown>>(obj: T, fieldsToRemove: readonly string[]): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!fieldsToRemove.includes(key)) {
      result[key] = value;
    }
  }

  return result as Partial<T>;
}

/**
 * Filter response data based on user role.
 * Handles single objects, arrays, and nested structures.
 */
export function filterResponseByRole<T>(data: T, role: UserRole): T {
  const fieldsToRemove = FIELDS_TO_STRIP[role] ?? FIELDS_TO_STRIP.employee;

  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => filterResponseByRole(item, role)) as T;
  }

  const obj = data as Record<string, unknown>;
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (fieldsToRemove.includes(key)) continue;

    // Recurse into nested objects and arrays (e.g., positions[], shifts[])
    if (Array.isArray(value)) {
      filtered[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? filterResponseByRole(item, role)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterResponseByRole(value, role);
    } else {
      filtered[key] = value;
    }
  }

  return filtered as T;
}

/**
 * Create a response helper that auto-filters by the request's role.
 *
 * Usage in handler:
 *   const send = createFilteredResponse(req.auth?.role ?? 'employee');
 *   res.json(send({ ok: true, data: shifts }));
 */
export function createFilteredResponse(role: UserRole) {
  return <T>(data: T): T => filterResponseByRole(data, role);
}
