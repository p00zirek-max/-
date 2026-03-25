import type { RoundingMode } from '../constants/rounding';
import type { ReportBlock } from '../constants/report-blocks';

/** Payment type for employee */
export type PaymentType = 'per_shift' | 'accord';

/** Employee category */
export type EmployeeCategory = 'crew' | 'cast' | 'extras';

/** Core employee record */
export interface Employee {
  id: string;
  project_id: string;
  name: string;
  category: EmployeeCategory;
  telegram_chat_id: string | null;
  personal_token: string | null;
  payment_type: PaymentType;
  accord_amount: number | null;
  is_active: boolean;
  attached_from: string | null;  // ISO date
  attached_to: string | null;    // ISO date
  created_at: string;
}

/** Position with rates — one employee can have multiple positions */
export interface EmployeePosition {
  id: string;
  employee_id: string;
  position: string;
  report_block: ReportBlock;
  shift_rate: number;
  overtime_hourly_rate: number;
  km_rate: number;
  unit_rate: number;
  fk_percent: number;
  shift_hours: number;
  rounding: RoundingMode;
  night_shift_rate: number | null;
  night_overtime_rate: number | null;
  night_shift_hours: number | null;
  break_hours: number;
  is_active: boolean;
}

/** Employee with all their positions */
export interface EmployeeWithPositions extends Employee {
  positions: EmployeePosition[];
}
