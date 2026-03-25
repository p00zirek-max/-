/**
 * CALCULATION ENGINE — The single source of truth for ALL financial calculations.
 *
 * CRITICAL: No other file in the project should contain calculation formulas.
 * All business rules from DECISIONS.md are implemented here.
 *
 * Decisions implemented:
 * - D-001: Ceil rounding (half_hour / hour)
 * - D-002: Multi-day shifts (days_in_shift)
 * - D-003: shift_hours = norm for overtime calculation
 * - D-005: per_shift vs accord payment types
 * - D-025: Coefficient (1.0 / 0.5 / 2.0)
 * - D-027: Each lunch checkbox adds +1h overtime
 * - D-028: Unit quantity * unit_rate
 */

import Decimal from 'decimal.js';
import type { EmployeePosition, ShiftCalculation, ExtrasCalculation } from '@kinotabel/shared';
import type { RoundingMode } from '@kinotabel/shared';
import { calculateRawHours, countLunchCheckboxes } from '../utils/time';
import { roundOvertime } from '../utils/rounding';
import { multiply, add, toMoneyString, fkMultiplier, toDecimal } from '../utils/money';

// ─── TYPES ─────────────────────────────────────────────────────────────

/** Input for shift calculation — raw form data */
export interface ShiftCalcInput {
  shift_start: string;        // HH:mm
  shift_end: string;          // HH:mm
  days_in_shift: number;      // 0, 1, 2, 3
  lunch_current: boolean;
  lunch_late: boolean;
  lunch_none: boolean;
  is_night: boolean;
  coefficient: number;        // 1.0, 0.5, 2.0
  overtime_km: number;
  unit_quantity: number;
}

/** Input for extras (АМС) calculation */
export interface ExtrasCalcInput {
  shift_start: string;
  shift_end: string;
  days_in_shift: number;
  quantity: number;
  rate: number;
  overtime_rate: number;
  shift_hours: number;
  rounding: RoundingMode;
}

/** Input for location overtime calculation */
export interface LocationCalcInput {
  shift_start: string;
  shift_end: string;
  shift_rate: number;
  overtime_hourly_rate: number;
  shift_hours: number;
  rounding: RoundingMode;
}

export interface LocationCalcResult {
  raw_hours: number;
  overtime_hours: number;
  overtime_amount: string;
  total_amount: string;
}

// ─── SHIFT CALCULATION ─────────────────────────────────────────────────

/**
 * Calculate a shift's financial values.
 *
 * This is the CORE function. Steps:
 * 1. Calculate raw hours (timeDiff + days_in_shift * 24)
 * 2. Subtract 1h for lunch if any lunch checkbox is checked
 * 3. Calculate overtime = max(0, raw_hours - shift_hours) + lunch_checkbox_count
 * 4. Apply ceil rounding to overtime
 * 5. Pick day/night rates
 * 6. Calculate all amounts using decimal.js
 * 7. Apply FK% multiplier
 */
export function calculateShift(
  input: ShiftCalcInput,
  position: EmployeePosition,
): ShiftCalculation {
  // ─── Step 1: Raw hours ───
  const rawHoursBeforeLunch = calculateRawHours(
    input.shift_start,
    input.shift_end,
    input.days_in_shift,
  );

  // ─── Step 2: Count lunch checkboxes (D-027) ───
  const lunchCount = countLunchCheckboxes(
    input.lunch_current,
    input.lunch_late,
    input.lunch_none,
  );

  // Subtract 1h if any lunch is checked (standard lunch deduction)
  const hasAnyLunch = lunchCount > 0;
  const rawHours = hasAnyLunch
    ? rawHoursBeforeLunch - 1
    : rawHoursBeforeLunch;

  // ─── Step 3: Pick rates (day vs night) ───
  const useNightRates = input.is_night
    && position.night_shift_rate !== null
    && position.night_shift_rate !== undefined
    && position.night_shift_rate > 0;

  const shiftRate = useNightRates ? position.night_shift_rate! : position.shift_rate;
  const overtimeRate = useNightRates
    ? (position.night_overtime_rate ?? position.overtime_hourly_rate)
    : position.overtime_hourly_rate;
  const shiftHoursNorm = useNightRates
    ? (position.night_shift_hours ?? position.shift_hours)
    : position.shift_hours;

  // ─── Step 4: Overtime calculation ───
  // Base overtime = max(0, raw_hours - norm)
  let overtimeRaw = Math.max(0, rawHours - shiftHoursNorm);

  // D-027: Each lunch checkbox adds +1h to overtime
  overtimeRaw += lunchCount;

  // D-001: Apply ceil rounding
  const overtimeHours = roundOvertime(overtimeRaw, position.rounding);

  // ─── Step 5: Calculate amounts with decimal.js ───

  // Shift amount: rate * coefficient (D-025)
  const shiftAmount = multiply(shiftRate, input.coefficient);

  // Overtime amount: overtime_hours * hourly_rate
  const overtimeAmount = multiply(overtimeHours, overtimeRate);

  // Km amount: overtime_km * km_rate
  const kmAmount = multiply(input.overtime_km, position.km_rate);

  // Unit amount: unit_quantity * unit_rate (D-028)
  const unitAmount = multiply(input.unit_quantity, position.unit_rate);

  // ─── Step 6: Totals ───
  const totalAmount = add(shiftAmount, overtimeAmount, kmAmount, unitAmount);

  // FK%: multiplier = 1 + (fk_percent / 100)
  const fkMul = fkMultiplier(position.fk_percent);
  const totalWithFk = totalAmount.mul(fkMul);

  return {
    raw_hours: rawHours,
    overtime_hours: overtimeHours,
    shift_amount: toMoneyString(shiftAmount),
    overtime_amount: toMoneyString(overtimeAmount),
    km_amount: toMoneyString(kmAmount),
    unit_amount: toMoneyString(unitAmount),
    total_amount: toMoneyString(totalAmount),
    total_with_fk: toMoneyString(totalWithFk),
  };
}

// ─── EXTRAS (АМС) CALCULATION ──────────────────────────────────────────

/**
 * Calculate extras (mass scene workers) amounts.
 *
 * shift_total    = quantity * rate
 * overtime_total = quantity * overtime_rate * overtime_hours
 * grand_total    = shift_total + overtime_total
 */
export function calculateExtras(input: ExtrasCalcInput): ExtrasCalculation {
  // Raw hours
  const rawHours = calculateRawHours(
    input.shift_start,
    input.shift_end,
    input.days_in_shift || 0,
  );

  // Overtime
  const overtimeRaw = Math.max(0, rawHours - input.shift_hours);
  const overtimeHours = roundOvertime(overtimeRaw, input.rounding);

  // Amounts
  const shiftTotal = multiply(input.quantity, input.rate);
  const overtimeTotal = multiply(input.quantity, input.overtime_rate).mul(
    toDecimal(overtimeHours),
  );
  const grandTotal = add(shiftTotal, overtimeTotal);

  return {
    raw_hours: rawHours,
    overtime_hours: overtimeHours,
    shift_total: toMoneyString(shiftTotal),
    overtime_total: toMoneyString(overtimeTotal),
    grand_total: toMoneyString(grandTotal),
  };
}

// ─── LOCATION CALCULATION ───────────────────────────────────────────────

/**
 * Calculate location overtime and total.
 * total = shift_rate + overtime_amount
 */
export function calculateLocation(input: LocationCalcInput): LocationCalcResult {
  const rawHours = calculateRawHours(input.shift_start, input.shift_end, 0);
  const overtimeRaw = Math.max(0, rawHours - input.shift_hours);
  const overtimeHours = roundOvertime(overtimeRaw, input.rounding);

  const overtimeAmount = multiply(overtimeHours, input.overtime_hourly_rate);
  const totalAmount = add(toDecimal(input.shift_rate), overtimeAmount);

  return {
    raw_hours: rawHours,
    overtime_hours: overtimeHours,
    overtime_amount: toMoneyString(overtimeAmount),
    total_amount: toMoneyString(totalAmount),
  };
}
