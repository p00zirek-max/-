/**
 * Unit tests for the Calculation Engine.
 *
 * Tests ALL edge cases from DECISIONS.md:
 * - D-001: Ceil rounding (half_hour and hour)
 * - D-002: Multi-day shifts (days_in_shift)
 * - D-025: Coefficients (1.0, 0.5, 2.0)
 * - D-027: Lunch checkboxes adding hours
 * - D-028: Unit quantity * unit_rate
 * - Night shifts with/without night rates
 * - FK% at various percentages
 * - Zero rates, zero overtime
 * - Extras (АМС) calculation
 * - Location calculation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateShift,
  calculateExtras,
  calculateLocation,
  type ShiftCalcInput,
  type ExtrasCalcInput,
  type LocationCalcInput,
} from '../../src/services/calculation-engine';
import type { EmployeePosition } from '@kinotabel/shared';

// ─── HELPERS ───────────────────────────────────────────────────────────

/** Create a default position with overrides */
function makePosition(overrides: Partial<EmployeePosition> = {}): EmployeePosition {
  return {
    id: 'pos-1',
    employee_id: 'emp-1',
    position: 'Тестовая должность',
    report_block: 'P',
    shift_rate: 10000,           // 10,000₽ per shift
    overtime_hourly_rate: 1000,  // 1,000₽ per overtime hour
    km_rate: 50,                 // 50₽ per km
    unit_rate: 500,              // 500₽ per unit
    fk_percent: 0,               // no FK by default
    shift_hours: 12,             // 12h norm
    rounding: 'hour',
    night_shift_rate: null,
    night_overtime_rate: null,
    night_shift_hours: null,
    break_hours: 1,
    is_active: true,
    ...overrides,
  };
}

/** Create a default shift input with overrides */
function makeInput(overrides: Partial<ShiftCalcInput> = {}): ShiftCalcInput {
  return {
    shift_start: '08:00',
    shift_end: '20:00',     // 12h shift, exactly norm
    days_in_shift: 0,
    lunch_current: false,
    lunch_late: false,
    lunch_none: false,
    is_night: false,
    coefficient: 1.0,
    overtime_km: 0,
    unit_quantity: 0,
    ...overrides,
  };
}

// ─── BASIC SHIFT CALCULATION ───────────────────────────────────────────

describe('calculateShift', () => {
  describe('Normal shift (no overtime)', () => {
    it('should calculate a standard 12h shift at norm', () => {
      const result = calculateShift(makeInput(), makePosition());

      expect(result.raw_hours).toBe(12);
      expect(result.overtime_hours).toBe(0);
      expect(result.shift_amount).toBe('10000.00');
      expect(result.overtime_amount).toBe('0.00');
      expect(result.km_amount).toBe('0.00');
      expect(result.unit_amount).toBe('0.00');
      expect(result.total_amount).toBe('10000.00');
      expect(result.total_with_fk).toBe('10000.00');
    });
  });

  describe('Overtime', () => {
    it('should calculate overtime for a 14h shift (2h over 12h norm)', () => {
      const result = calculateShift(
        makeInput({ shift_start: '08:00', shift_end: '22:00' }),
        makePosition(),
      );

      expect(result.raw_hours).toBe(14);
      expect(result.overtime_hours).toBe(2);
      expect(result.overtime_amount).toBe('2000.00'); // 2 * 1000
      expect(result.total_amount).toBe('12000.00');   // 10000 + 2000
    });

    it('should return zero overtime when exactly at norm', () => {
      const result = calculateShift(makeInput(), makePosition());
      expect(result.overtime_hours).toBe(0);
      expect(result.overtime_amount).toBe('0.00');
    });

    it('should return zero overtime when under norm', () => {
      const result = calculateShift(
        makeInput({ shift_start: '08:00', shift_end: '18:00' }), // 10h
        makePosition(),
      );
      expect(result.raw_hours).toBe(10);
      expect(result.overtime_hours).toBe(0);
    });
  });

  // ─── MIDNIGHT CROSSING (D-002) ──────────────────────────────────────

  describe('Midnight crossing (D-002)', () => {
    it('should handle shift crossing midnight', () => {
      const result = calculateShift(
        makeInput({ shift_start: '20:00', shift_end: '06:00' }), // 10h
        makePosition(),
      );
      expect(result.raw_hours).toBe(10);
      expect(result.overtime_hours).toBe(0); // under 12h norm
    });

    it('should handle shift crossing midnight with overtime', () => {
      const result = calculateShift(
        makeInput({ shift_start: '18:00', shift_end: '08:00' }), // 14h
        makePosition(),
      );
      expect(result.raw_hours).toBe(14);
      expect(result.overtime_hours).toBe(2);
    });
  });

  // ─── MULTI-DAY SHIFT (D-002) ────────────────────────────────────────

  describe('Multi-day shift (D-002)', () => {
    it('should add 24h per days_in_shift', () => {
      const result = calculateShift(
        makeInput({
          shift_start: '08:00',
          shift_end: '08:00', // 0h diff, but days=1 → 24h
          days_in_shift: 1,
        }),
        makePosition(),
      );
      expect(result.raw_hours).toBe(24);
      expect(result.overtime_hours).toBe(12); // 24 - 12 = 12h overtime
    });

    it('should handle 2-day shift', () => {
      const result = calculateShift(
        makeInput({
          shift_start: '08:00',
          shift_end: '20:00',
          days_in_shift: 2,
        }),
        makePosition({ shift_hours: 23 }),
      );
      // 12 + 48 = 60h raw
      expect(result.raw_hours).toBe(60);
      expect(result.overtime_hours).toBe(37); // 60 - 23 = 37
    });

    it('should handle overnight shift with days_in_shift=0 (just midnight cross)', () => {
      const result = calculateShift(
        makeInput({
          shift_start: '18:00',
          shift_end: '00:30',
          days_in_shift: 0,
        }),
        makePosition(),
      );
      expect(result.raw_hours).toBe(6.5);
      expect(result.overtime_hours).toBe(0);
    });
  });

  // ─── CEIL ROUNDING (D-001) ──────────────────────────────────────────

  describe('Ceil rounding (D-001)', () => {
    it('should ceil to hour: 2h40m → 3h', () => {
      // 12h norm + 2h40m overtime = 14h40m
      const result = calculateShift(
        makeInput({ shift_start: '06:00', shift_end: '20:40' }),
        makePosition({ rounding: 'hour' }),
      );
      // raw = 14.667h, overtime_raw = 2.667h, ceil to hour = 3h
      expect(result.overtime_hours).toBe(3);
    });

    it('should ceil to hour: 2h10m → 3h', () => {
      const result = calculateShift(
        makeInput({ shift_start: '06:00', shift_end: '20:10' }),
        makePosition({ rounding: 'hour' }),
      );
      // raw = 14.167h, overtime = 2.167h, ceil = 3h
      expect(result.overtime_hours).toBe(3);
    });

    it('should ceil to hour: exactly 2h → 2h (no rounding needed)', () => {
      const result = calculateShift(
        makeInput({ shift_start: '06:00', shift_end: '20:00' }), // 14h
        makePosition({ rounding: 'hour' }),
      );
      expect(result.overtime_hours).toBe(2);
    });

    it('should ceil to half_hour: 2h40m → 3h', () => {
      const result = calculateShift(
        makeInput({ shift_start: '06:00', shift_end: '20:40' }),
        makePosition({ rounding: 'half_hour' }),
      );
      // overtime_raw = 2.667h, ceil to 0.5 = 3.0h
      expect(result.overtime_hours).toBe(3);
    });

    it('should ceil to half_hour: 2h10m → 2.5h', () => {
      const result = calculateShift(
        makeInput({ shift_start: '06:00', shift_end: '20:10' }),
        makePosition({ rounding: 'half_hour' }),
      );
      // overtime_raw = 2.167h, ceil to 0.5 = 2.5h
      expect(result.overtime_hours).toBe(2.5);
    });

    it('should ceil to half_hour: exactly 2h → 2h', () => {
      const result = calculateShift(
        makeInput({ shift_start: '06:00', shift_end: '20:00' }),
        makePosition({ rounding: 'half_hour' }),
      );
      expect(result.overtime_hours).toBe(2);
    });

    it('should ceil to half_hour: 2h01m → 2.5h', () => {
      const result = calculateShift(
        makeInput({ shift_start: '06:00', shift_end: '20:01' }),
        makePosition({ rounding: 'half_hour' }),
      );
      // overtime_raw = 2.0167h, ceil to 0.5 = 2.5h
      expect(result.overtime_hours).toBe(2.5);
    });
  });

  // ─── COEFFICIENTS (D-025) ──────────────────────────────────────────

  describe('Coefficient (D-025)', () => {
    it('should apply full shift coefficient (1.0)', () => {
      const result = calculateShift(
        makeInput({ coefficient: 1.0 }),
        makePosition(),
      );
      expect(result.shift_amount).toBe('10000.00');
    });

    it('should apply half shift coefficient (0.5)', () => {
      const result = calculateShift(
        makeInput({ coefficient: 0.5 }),
        makePosition(),
      );
      expect(result.shift_amount).toBe('5000.00');
    });

    it('should apply double shift coefficient (2.0)', () => {
      const result = calculateShift(
        makeInput({ coefficient: 2.0 }),
        makePosition(),
      );
      expect(result.shift_amount).toBe('20000.00');
    });
  });

  // ─── FK% ────────────────────────────────────────────────────────────

  describe('FK% (Фонд кино)', () => {
    it('should apply FK 0% (no change)', () => {
      const result = calculateShift(
        makeInput(),
        makePosition({ fk_percent: 0 }),
      );
      expect(result.total_with_fk).toBe('10000.00');
    });

    it('should apply FK 9%', () => {
      const result = calculateShift(
        makeInput(),
        makePosition({ fk_percent: 9 }),
      );
      // 10000 * 1.09 = 10900
      expect(result.total_with_fk).toBe('10900.00');
    });

    it('should apply FK 100%', () => {
      const result = calculateShift(
        makeInput(),
        makePosition({ fk_percent: 100 }),
      );
      // 10000 * 2.0 = 20000
      expect(result.total_with_fk).toBe('20000.00');
    });

    it('should apply FK to total (shift + overtime + km + units)', () => {
      const result = calculateShift(
        makeInput({
          shift_start: '08:00',
          shift_end: '22:00', // 14h → 2h overtime
          overtime_km: 10,
          unit_quantity: 3,
        }),
        makePosition({ fk_percent: 10 }),
      );
      // shift=10000, overtime=2000, km=500, units=1500
      // total=14000, FK=1.10, total_with_fk=15400
      expect(result.total_amount).toBe('14000.00');
      expect(result.total_with_fk).toBe('15400.00');
    });
  });

  // ─── NIGHT SHIFT ────────────────────────────────────────────────────

  describe('Night shift', () => {
    it('should use night rates when is_night and night rates exist', () => {
      const result = calculateShift(
        makeInput({
          is_night: true,
          shift_start: '20:00',
          shift_end: '08:00', // 12h
        }),
        makePosition({
          shift_rate: 10000,
          night_shift_rate: 15000,
          night_overtime_rate: 1500,
          night_shift_hours: 10,
        }),
      );
      expect(result.shift_amount).toBe('15000.00');
      // 12h - 10h norm = 2h overtime at 1500
      expect(result.overtime_hours).toBe(2);
      expect(result.overtime_amount).toBe('3000.00');
    });

    it('should use day rates when is_night but no night rates set', () => {
      const result = calculateShift(
        makeInput({ is_night: true }),
        makePosition({
          shift_rate: 10000,
          night_shift_rate: null,
          night_overtime_rate: null,
          night_shift_hours: null,
        }),
      );
      expect(result.shift_amount).toBe('10000.00');
    });

    it('should use day rates when is_night=false even if night rates exist', () => {
      const result = calculateShift(
        makeInput({ is_night: false }),
        makePosition({
          shift_rate: 10000,
          night_shift_rate: 15000,
        }),
      );
      expect(result.shift_amount).toBe('10000.00');
    });
  });

  // ─── LUNCH CHECKBOXES (D-027) ──────────────────────────────────────

  describe('Lunch checkboxes (D-027)', () => {
    it('should add +1h overtime for one checkbox', () => {
      const result = calculateShift(
        makeInput({ lunch_current: true }), // 1 checkbox
        makePosition(),
      );
      // raw_hours = 12 - 1 (lunch) = 11
      // overtime_raw = max(0, 11-12) + 1 = 1
      expect(result.overtime_hours).toBe(1);
      expect(result.overtime_amount).toBe('1000.00');
    });

    it('should add +2h overtime for two checkboxes', () => {
      const result = calculateShift(
        makeInput({ lunch_current: true, lunch_late: true }),
        makePosition(),
      );
      // raw = 12 - 1 = 11, overtime = max(0, 11-12) + 2 = 2
      expect(result.overtime_hours).toBe(2);
    });

    it('should add +3h overtime for three checkboxes', () => {
      const result = calculateShift(
        makeInput({
          lunch_current: true,
          lunch_late: true,
          lunch_none: true,
        }),
        makePosition(),
      );
      // raw = 12 - 1 = 11, overtime = max(0, 11-12) + 3 = 3
      expect(result.overtime_hours).toBe(3);
    });

    it('should add 0h when no checkboxes', () => {
      const result = calculateShift(makeInput(), makePosition());
      expect(result.overtime_hours).toBe(0);
    });

    it('should combine lunch overtime with time-based overtime', () => {
      const result = calculateShift(
        makeInput({
          shift_start: '06:00',
          shift_end: '20:00', // 14h
          lunch_current: true,
          lunch_late: true,
        }),
        makePosition(),
      );
      // raw = 14 - 1 = 13, overtime_raw = max(0, 13-12) + 2 = 3
      expect(result.overtime_hours).toBe(3);
    });
  });

  // ─── KM AND UNITS ──────────────────────────────────────────────────

  describe('Km (перепробег)', () => {
    it('should calculate km amount', () => {
      const result = calculateShift(
        makeInput({ overtime_km: 100 }),
        makePosition({ km_rate: 50 }),
      );
      expect(result.km_amount).toBe('5000.00');
    });

    it('should handle zero km', () => {
      const result = calculateShift(
        makeInput({ overtime_km: 0 }),
        makePosition(),
      );
      expect(result.km_amount).toBe('0.00');
    });
  });

  describe('Units (D-028)', () => {
    it('should calculate unit amount', () => {
      const result = calculateShift(
        makeInput({ unit_quantity: 3 }),
        makePosition({ unit_rate: 500 }),
      );
      expect(result.unit_amount).toBe('1500.00'); // 3 * 500
    });

    it('should handle zero units', () => {
      const result = calculateShift(
        makeInput({ unit_quantity: 0 }),
        makePosition(),
      );
      expect(result.unit_amount).toBe('0.00');
    });
  });

  // ─── ZERO RATES ────────────────────────────────────────────────────

  describe('Zero rates', () => {
    it('should handle zero shift rate', () => {
      const result = calculateShift(
        makeInput(),
        makePosition({ shift_rate: 0 }),
      );
      expect(result.shift_amount).toBe('0.00');
      expect(result.total_amount).toBe('0.00');
    });

    it('should handle all zero rates', () => {
      const result = calculateShift(
        makeInput({ overtime_km: 10, unit_quantity: 5 }),
        makePosition({
          shift_rate: 0,
          overtime_hourly_rate: 0,
          km_rate: 0,
          unit_rate: 0,
        }),
      );
      expect(result.total_amount).toBe('0.00');
      expect(result.total_with_fk).toBe('0.00');
    });
  });

  // ─── COMPLEX SCENARIO ─────────────────────────────────────────────

  describe('Complex scenario', () => {
    it('should calculate correctly with all factors', () => {
      const result = calculateShift(
        makeInput({
          shift_start: '18:00',
          shift_end: '08:00',   // 14h via midnight
          days_in_shift: 0,
          lunch_current: true,
          lunch_late: true,     // +2h overtime
          is_night: true,
          coefficient: 1.0,
          overtime_km: 20,
          unit_quantity: 2,
        }),
        makePosition({
          shift_rate: 10000,
          overtime_hourly_rate: 1000,
          km_rate: 50,
          unit_rate: 500,
          fk_percent: 9,
          shift_hours: 12,
          rounding: 'half_hour',
          night_shift_rate: 15000,
          night_overtime_rate: 1500,
          night_shift_hours: 10,
        }),
      );

      // raw = 14 - 1 (lunch) = 13
      // overtime_raw = max(0, 13-10) + 2 = 5
      // rounded (half_hour) = 5 (already exact)
      expect(result.raw_hours).toBe(13);
      expect(result.overtime_hours).toBe(5);
      expect(result.shift_amount).toBe('15000.00');       // night rate * 1.0
      expect(result.overtime_amount).toBe('7500.00');     // 5 * 1500
      expect(result.km_amount).toBe('1000.00');           // 20 * 50
      expect(result.unit_amount).toBe('1000.00');         // 2 * 500
      expect(result.total_amount).toBe('24500.00');       // 15000+7500+1000+1000
      expect(result.total_with_fk).toBe('26705.00');      // 24500 * 1.09
    });
  });
});

// ─── EXTRAS (АМС) ─────────────────────────────────────────────────────

describe('calculateExtras', () => {
  it('should calculate extras with no overtime', () => {
    const result = calculateExtras({
      shift_start: '08:00',
      shift_end: '20:00', // 12h
      days_in_shift: 0,
      quantity: 10,
      rate: 5000,
      overtime_rate: 500,
      shift_hours: 12,
      rounding: 'hour',
    });

    expect(result.raw_hours).toBe(12);
    expect(result.overtime_hours).toBe(0);
    expect(result.shift_total).toBe('50000.00');     // 10 * 5000
    expect(result.overtime_total).toBe('0.00');
    expect(result.grand_total).toBe('50000.00');
  });

  it('should calculate extras with overtime', () => {
    const result = calculateExtras({
      shift_start: '08:00',
      shift_end: '22:00', // 14h → 2h overtime
      days_in_shift: 0,
      quantity: 5,
      rate: 3000,
      overtime_rate: 400,
      shift_hours: 12,
      rounding: 'hour',
    });

    expect(result.overtime_hours).toBe(2);
    expect(result.shift_total).toBe('15000.00');     // 5 * 3000
    expect(result.overtime_total).toBe('4000.00');   // 5 * 400 * 2
    expect(result.grand_total).toBe('19000.00');
  });

  it('should handle extras crossing midnight', () => {
    const result = calculateExtras({
      shift_start: '20:00',
      shift_end: '08:00', // 12h
      days_in_shift: 0,
      quantity: 3,
      rate: 2000,
      overtime_rate: 300,
      shift_hours: 10,
      rounding: 'hour',
    });

    expect(result.raw_hours).toBe(12);
    expect(result.overtime_hours).toBe(2);
    expect(result.shift_total).toBe('6000.00');      // 3 * 2000
    expect(result.overtime_total).toBe('1800.00');   // 3 * 300 * 2
    expect(result.grand_total).toBe('7800.00');
  });
});

// ─── LOCATION CALCULATION ──────────────────────────────────────────────

describe('calculateLocation', () => {
  it('should calculate location with no overtime', () => {
    const result = calculateLocation({
      shift_start: '08:00',
      shift_end: '20:00',
      shift_rate: 50000,
      overtime_hourly_rate: 5000,
      shift_hours: 12,
      rounding: 'hour',
    });

    expect(result.overtime_hours).toBe(0);
    expect(result.overtime_amount).toBe('0.00');
    expect(result.total_amount).toBe('50000.00');
  });

  it('should calculate location with overtime', () => {
    const result = calculateLocation({
      shift_start: '08:00',
      shift_end: '23:00', // 15h → 3h overtime
      shift_rate: 50000,
      overtime_hourly_rate: 5000,
      shift_hours: 12,
      rounding: 'hour',
    });

    expect(result.overtime_hours).toBe(3);
    expect(result.overtime_amount).toBe('15000.00');
    expect(result.total_amount).toBe('65000.00');
  });

  it('should apply half_hour rounding to location overtime', () => {
    const result = calculateLocation({
      shift_start: '08:00',
      shift_end: '22:10', // 14h10m → 2h10m overtime → ceil to 2.5
      shift_rate: 50000,
      overtime_hourly_rate: 5000,
      shift_hours: 12,
      rounding: 'half_hour',
    });

    expect(result.overtime_hours).toBe(2.5);
    expect(result.overtime_amount).toBe('12500.00');
    expect(result.total_amount).toBe('62500.00');
  });
});
