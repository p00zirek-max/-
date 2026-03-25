import { api } from './client';
import type {
  SummaryReport,
  ProductionReport,
  ReportFilters,
} from '@kinotabel/shared';

export interface IndividualReportData {
  employee_id: string;
  employee_name: string;
  positions: Array<{
    position_id: string;
    position: string;
    shift_rate: number;
    overtime_hourly_rate: number;
    km_rate: number;
    unit_rate: number;
    fk_percent: number;
  }>;
  shifts: Array<{
    id: string;
    date: string;
    position: string;
    shift_start: string;
    shift_end: string;
    overtime_hours: number;
    total_amount: string;
    total_with_fk: string;
  }>;
  totals: {
    shift_count: number;
    overtime_hours_total: number;
    grand_total: string;
    grand_total_with_fk: string;
  };
}

export const reportsApi = {
  getSummary(filters: ReportFilters): Promise<SummaryReport> {
    return api.get<SummaryReport>('/reports/summary', {
      project_id: filters.project_id,
      employee_ids: filters.employee_ids?.join(','),
      position_ids: filters.position_ids?.join(','),
      date_from: filters.date_from,
      date_to: filters.date_to,
      months: filters.months?.join(','),
    });
  },

  getIndividual(employeeId: string): Promise<IndividualReportData> {
    return api.get<IndividualReportData>(`/reports/individual/${employeeId}`);
  },

  getProductionReport(date: string): Promise<ProductionReport> {
    return api.get<ProductionReport>(`/reports/production/${date}`);
  },
};
