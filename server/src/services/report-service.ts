/**
 * Report Service — generates summary, individual, and by-position reports.
 *
 * All financial aggregation uses decimal.js (via money utils).
 * No calculations here — only aggregation of pre-calculated shift data.
 */

import Decimal from 'decimal.js';
import type {
  SummaryReport, SummaryReportRow, ReportFilters,
} from '@kinotabel/shared';
import { getShiftRepository, getEmployeeRepository, getExtrasRepository } from '../repositories';
import { add, toMoneyString, toDecimal } from '../utils/money';
import { dateInRange, dateInMonth } from '../utils/time';

export class ReportService {
  private readonly shiftRepo = getShiftRepository();
  private readonly empRepo = getEmployeeRepository();
  private readonly extrasRepo = getExtrasRepository();

  /**
   * Generate summary report with filters (D-011).
   */
  async getSummaryReport(filters: ReportFilters): Promise<SummaryReport> {
    // Get all shifts for the project
    const shifts = await this.shiftRepo.findAll({
      project_id: filters.project_id,
    });

    // Apply filters
    let filteredShifts = shifts;

    if (filters.employee_ids && filters.employee_ids.length > 0) {
      const ids = new Set(filters.employee_ids);
      filteredShifts = filteredShifts.filter(s => ids.has(s.employee_id));
    }
    if (filters.position_ids && filters.position_ids.length > 0) {
      const ids = new Set(filters.position_ids);
      filteredShifts = filteredShifts.filter(s => ids.has(s.position_id));
    }
    if (filters.date_from || filters.date_to) {
      filteredShifts = filteredShifts.filter(s =>
        dateInRange(s.date, filters.date_from, filters.date_to)
      );
    }
    if (filters.months && filters.months.length > 0) {
      filteredShifts = filteredShifts.filter(s =>
        filters.months!.some((m: string) => dateInMonth(s.date, m))
      );
    }

    // Group by employee_id + position_id
    const groups = new Map<string, typeof filteredShifts>();
    for (const shift of filteredShifts) {
      const key = `${shift.employee_id}::${shift.position_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(shift);
    }

    // Build rows
    const rows: SummaryReportRow[] = [];

    for (const [key, groupShifts] of groups) {
      const [employeeId, positionId] = key.split('::');
      const employee = await this.empRepo.findById(employeeId);
      const position = await this.empRepo.getPositionById(positionId);

      if (!employee || !position) continue;

      const shiftCount = groupShifts.length;
      const unitCount = groupShifts.reduce((sum, s) => sum + s.unit_quantity, 0);
      const overtimeHoursTotal = groupShifts.reduce(
        (sum, s) => sum + s.overtime_hours, 0,
      );
      const kmTotal = groupShifts.reduce((sum, s) => sum + s.overtime_km, 0);

      const shiftsTotal = groupShifts.reduce(
        (sum, s) => sum.plus(toDecimal(s.shift_amount)),
        new Decimal(0),
      );
      const overtimeTotal = groupShifts.reduce(
        (sum, s) => sum.plus(toDecimal(s.overtime_amount)),
        new Decimal(0),
      );
      const kmTotalAmount = groupShifts.reduce(
        (sum, s) => sum.plus(toDecimal(s.km_amount)),
        new Decimal(0),
      );
      const unitsTotal = groupShifts.reduce(
        (sum, s) => sum.plus(toDecimal(s.unit_amount)),
        new Decimal(0),
      );
      const grandTotal = groupShifts.reduce(
        (sum, s) => sum.plus(toDecimal(s.total_amount)),
        new Decimal(0),
      );
      const grandTotalWithFk = groupShifts.reduce(
        (sum, s) => sum.plus(toDecimal(s.total_with_fk)),
        new Decimal(0),
      );

      rows.push({
        employee_id: employeeId,
        employee_name: employee.name,
        position_id: positionId,
        position: position.position,
        report_block: position.report_block,
        fk_percent: position.fk_percent,
        shift_rate: position.shift_rate,
        overtime_hourly_rate: position.overtime_hourly_rate,
        km_rate: position.km_rate,
        unit_rate: position.unit_rate,
        shift_count: shiftCount,
        unit_count: unitCount,
        overtime_hours_total: overtimeHoursTotal,
        km_total: kmTotal,
        shifts_total: toMoneyString(shiftsTotal),
        overtime_total: toMoneyString(overtimeTotal),
        km_total_amount: toMoneyString(kmTotalAmount),
        units_total: toMoneyString(unitsTotal),
        grand_total: toMoneyString(grandTotal),
        grand_total_with_fk: toMoneyString(grandTotalWithFk),
      });
    }

    // Totals
    const totalShiftCount = rows.reduce((sum, r) => sum + r.shift_count, 0);
    const totalGrand = rows.reduce(
      (sum, r) => sum.plus(toDecimal(r.grand_total)),
      new Decimal(0),
    );
    const totalGrandWithFk = rows.reduce(
      (sum, r) => sum.plus(toDecimal(r.grand_total_with_fk)),
      new Decimal(0),
    );

    return {
      rows,
      totals: {
        shift_count: totalShiftCount,
        grand_total: toMoneyString(totalGrand),
        grand_total_with_fk: toMoneyString(totalGrandWithFk),
      },
      filters,
    };
  }

  /**
   * Individual report for a specific employee (D-012).
   */
  async getIndividualReport(
    projectId: string,
    employeeId: string,
  ): Promise<SummaryReport> {
    return this.getSummaryReport({
      project_id: projectId,
      employee_ids: [employeeId],
    });
  }

  /**
   * Report grouped by position.
   */
  async getByPositionReport(projectId: string): Promise<SummaryReport> {
    const report = await this.getSummaryReport({ project_id: projectId });
    // Sort by position name
    report.rows.sort((a: SummaryReportRow, b: SummaryReportRow) => a.position.localeCompare(b.position));
    return report;
  }
}
