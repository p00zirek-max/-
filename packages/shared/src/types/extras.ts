import type { RoundingMode } from '../constants/rounding';

/** Extras (АМС) input — mass scene workers */
export interface ExtrasInput {
  project_id: string;
  date: string;             // ISO date
  role: string;             // e.g. "прохожие", "официанты"
  quantity: number;
  rate: number;             // per-person shift rate
  overtime_rate: number;    // per-person overtime hourly rate
  shift_hours: number;
  rounding: RoundingMode;
  shift_start: string;      // HH:mm
  shift_end: string;        // HH:mm
  days_in_shift?: number;   // 0, 1
  comment?: string;
}

/** Calculated extras result */
export interface ExtrasCalculation {
  raw_hours: number;
  overtime_hours: number;
  shift_total: string;       // quantity * rate
  overtime_total: string;    // quantity * overtime_rate * overtime_hours
  grand_total: string;       // shift_total + overtime_total
}

/** Full extras record */
export interface Extras extends ExtrasInput {
  id: string;
  overtime_hours: number;
  shift_total: string;
  overtime_total: string;
  grand_total: string;
}
