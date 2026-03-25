import type { RoundingMode } from '../constants/rounding';

/** Location record */
export interface Location {
  id: string;
  project_id: string;
  date: string;               // ISO date
  address: string;
  object_name: string;
  shift_rate: number;
  overtime_hourly_rate: number;
  shift_hours: number;
  rounding: RoundingMode;
  shift_start: string;        // HH:mm
  shift_end: string;          // HH:mm

  // Calculated
  overtime_hours: number;
  overtime_amount: string;
  total_amount: string;

  comment: string | null;
}

/** Location input */
export interface LocationInput {
  project_id: string;
  date: string;
  address: string;
  object_name: string;
  shift_rate: number;
  overtime_hourly_rate: number;
  shift_hours: number;
  rounding: RoundingMode;
  shift_start: string;
  shift_end: string;
  comment?: string;
}
