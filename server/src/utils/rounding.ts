/**
 * Rounding utilities for overtime (D-001).
 * All rounding uses Math.ceil (always rounds UP).
 */

import type { RoundingMode } from '@kinotabel/shared';

/**
 * Ceil to the nearest half hour.
 * 2h40m → 3h, 2h01m → 2.5h, 2h00m → 2h
 *
 * Algorithm: multiply by 2, ceil, divide by 2.
 *
 * @param hours fractional hours
 * @returns hours rounded up to nearest 0.5
 */
export function ceilToHalfHour(hours: number): number {
  return Math.ceil(hours * 2) / 2;
}

/**
 * Ceil to the nearest full hour.
 * 2h10m → 3h, 2h01m → 3h, 2h00m → 2h
 *
 * @param hours fractional hours
 * @returns hours rounded up to nearest 1.0
 */
export function ceilToHour(hours: number): number {
  return Math.ceil(hours);
}

/**
 * Apply the appropriate rounding mode to overtime hours.
 *
 * @param hours    raw overtime hours
 * @param mode     rounding mode from employee position settings
 * @returns rounded overtime hours (always >= input for positive values)
 */
export function roundOvertime(hours: number, mode: RoundingMode): number {
  if (hours <= 0) return 0;

  switch (mode) {
    case 'half_hour':
      return ceilToHalfHour(hours);
    case 'hour':
      return ceilToHour(hours);
    default:
      return ceilToHour(hours);
  }
}
