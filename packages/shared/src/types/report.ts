import type { ReportBlock } from '../constants/report-blocks';
import type { TimingShift, TimingScene } from './timing';
import type { Extras } from './extras';
import type { Location } from './location';

/** Summary report row — one per employee-position */
export interface SummaryReportRow {
  employee_id: string;
  employee_name: string;
  position_id: string;
  position: string;
  report_block: ReportBlock;
  fk_percent: number;
  shift_rate: number;
  overtime_hourly_rate: number;
  km_rate: number;
  unit_rate: number;
  shift_count: number;
  unit_count: number;
  overtime_hours_total: number;
  km_total: number;
  shifts_total: string;        // decimal string
  overtime_total: string;
  km_total_amount: string;
  units_total: string;
  grand_total: string;
  grand_total_with_fk: string;
}

/** Summary report with totals */
export interface SummaryReport {
  rows: SummaryReportRow[];
  totals: {
    shift_count: number;
    grand_total: string;
    grand_total_with_fk: string;
  };
  filters: ReportFilters;
}

/** Report filters */
export interface ReportFilters {
  project_id: string;
  employee_ids?: string[];
  position_ids?: string[];
  date_from?: string;
  date_to?: string;
  months?: string[];       // e.g. ["2026-03", "2026-04"]
}

/** Production report — daily report grouped by blocks */
export interface ProductionReport {
  project_id: string;
  date: string;
  shift_number: number;
  project_name: string;
  director: string;
  cameraman: string;

  timing: TimingShift | null;
  scenes: TimingScene[];

  blocks: Record<ReportBlock, ProductionReportBlock>;

  extras: Extras[];
  locations: Location[];
}

/** One block of the production report (e.g., actors, crew, transport) */
export interface ProductionReportBlock {
  label: string;
  items: ProductionReportItem[];
}

/** One row in a production report block */
export interface ProductionReportItem {
  employee_id: string;
  employee_name: string;
  position: string;
  shift_rate: number;
  shift_start: string;
  shift_end: string;
  overtime_hours: number;
  overtime_km: number;
  total_amount: string;
}

/** Dashboard overview */
export interface DashboardOverview {
  total_expenses: string;           // decimal string — total for period
  shifts_today: number;
  shifts_this_week: number;
  unfilled_employees: UnfilledEmployee[];
  top_overtime: OvertimeEntry[];
  expenses_by_block: BlockExpense[];
  expenses_by_day: DayExpense[];
  scenes_plan_vs_fact: SceneStats;
  last_production_report_date: string | null;
}

export interface UnfilledEmployee {
  employee_id: string;
  employee_name: string;
  last_shift_date: string | null;
}

export interface OvertimeEntry {
  employee_id: string;
  employee_name: string;
  position: string;
  overtime_hours: number;
}

export interface BlockExpense {
  block: ReportBlock;
  label: string;
  total: string;
}

export interface DayExpense {
  date: string;
  total: string;
}

export interface SceneStats {
  total_plan: number;
  total_fact: number;
}
