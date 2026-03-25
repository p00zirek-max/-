import type { ShiftCoefficient } from '../constants/coefficients';

/** Raw shift input — what comes from the form */
export interface ShiftInput {
  project_id: string;
  employee_id: string;
  position_id: string;
  location_id?: string | null;
  date: string;           // ISO date, e.g. "2026-03-21"
  shift_start: string;    // HH:mm
  shift_end: string;      // HH:mm
  days_in_shift: number;  // 0, 1, 2, 3
  lunch_current: boolean;
  lunch_late: boolean;
  lunch_none: boolean;
  is_night: boolean;
  coefficient: ShiftCoefficient;
  address?: string;
  overtime_km: number;
  unit_quantity: number;
  comment?: string;
}

/** Calculated shift result */
export interface ShiftCalculation {
  raw_hours: number;
  overtime_hours: number;
  shift_amount: string;      // decimal string
  overtime_amount: string;
  km_amount: string;
  unit_amount: string;
  total_amount: string;
  total_with_fk: string;
}

/** Full shift record (input + calculated + metadata) */
export interface Shift extends ShiftInput {
  id: string;
  shift_number?: number;
  overtime_hours: number;
  shift_amount: string;
  overtime_amount: string;
  km_amount: string;
  unit_amount: string;
  total_amount: string;
  total_with_fk: string;
  locked: boolean;
  submitted_at: string;    // ISO datetime
}
