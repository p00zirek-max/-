/**
 * Dashboard Service — 8 widgets (D-031).
 */

import Decimal from 'decimal.js';
import type {
  DashboardOverview, UnfilledEmployee, OvertimeEntry,
  BlockExpense, DayExpense, SceneStats,
} from '@kinotabel/shared';
import { REPORT_BLOCK_LABELS } from '@kinotabel/shared';
import type { ReportBlock } from '@kinotabel/shared';
import {
  getShiftRepository, getEmployeeRepository,
  getExtrasRepository, getTimingRepository,
} from '../repositories';
import { toDecimal, toMoneyString, add } from '../utils/money';
import { getWeekBounds, dateInRange } from '../utils/time';

export class DashboardService {
  private readonly shiftRepo = getShiftRepository();
  private readonly empRepo = getEmployeeRepository();
  private readonly extrasRepo = getExtrasRepository();
  private readonly timingRepo = getTimingRepository();

  /**
   * Get all dashboard data in one call.
   */
  async getOverview(
    projectId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<DashboardOverview> {
    const today = new Date().toISOString().slice(0, 10);
    const weekBounds = getWeekBounds(today);

    // Fetch all data
    const allShifts = await this.shiftRepo.findAll({ project_id: projectId });
    const allExtras = await this.extrasRepo.findAll({ project_id: projectId });
    const allEmployees = await this.empRepo.findAll({
      project_id: projectId,
      is_active: true,
    });

    // Filter by date range if provided
    const periodShifts = (dateFrom || dateTo)
      ? allShifts.filter(s => dateInRange(s.date, dateFrom, dateTo))
      : allShifts;

    const periodExtras = (dateFrom || dateTo)
      ? allExtras.filter(e => dateInRange(e.date, dateFrom, dateTo))
      : allExtras;

    // ─── Widget 1: Total expenses ───
    const shiftExpenses = periodShifts.reduce(
      (sum, s) => sum.plus(toDecimal(s.total_with_fk)),
      new Decimal(0),
    );
    const extrasExpenses = periodExtras.reduce(
      (sum, e) => sum.plus(toDecimal(e.grand_total)),
      new Decimal(0),
    );
    const totalExpenses = shiftExpenses.plus(extrasExpenses);

    // ─── Widget 2: Shifts today / this week ───
    const shiftsToday = allShifts.filter(s => s.date === today).length;
    const shiftsThisWeek = allShifts.filter(
      s => dateInRange(s.date, weekBounds.from, weekBounds.to),
    ).length;

    // ─── Widget 3: Unfilled employees ───
    const employeeLastShift = new Map<string, string>();
    for (const shift of allShifts) {
      const current = employeeLastShift.get(shift.employee_id);
      if (!current || shift.date > current) {
        employeeLastShift.set(shift.employee_id, shift.date);
      }
    }
    const unfilled: UnfilledEmployee[] = allEmployees
      .filter(e => {
        const lastDate = employeeLastShift.get(e.id);
        return !lastDate || lastDate < today;
      })
      .map(e => ({
        employee_id: e.id,
        employee_name: e.name,
        last_shift_date: employeeLastShift.get(e.id) || null,
      }));

    // ─── Widget 4: Top-5 overtime ───
    const overtimeByEmployee = new Map<string, { hours: number; name: string; position: string }>();
    for (const shift of periodShifts) {
      const key = shift.employee_id;
      const existing = overtimeByEmployee.get(key);
      if (existing) {
        existing.hours += shift.overtime_hours;
      } else {
        const emp = allEmployees.find(e => e.id === shift.employee_id);
        overtimeByEmployee.set(key, {
          hours: shift.overtime_hours,
          name: emp?.name || shift.employee_id,
          position: '', // Could fetch from position
        });
      }
    }
    const topOvertime: OvertimeEntry[] = Array.from(overtimeByEmployee.entries())
      .map(([empId, data]) => ({
        employee_id: empId,
        employee_name: data.name,
        position: data.position,
        overtime_hours: data.hours,
      }))
      .sort((a, b) => b.overtime_hours - a.overtime_hours)
      .slice(0, 5);

    // ─── Widget 5: Expenses by block ───
    const byBlock = new Map<string, Decimal>();
    for (const shift of periodShifts) {
      // Use first char of employee_id as block prefix (D-026)
      const block = shift.employee_id.charAt(0);
      const current = byBlock.get(block) || new Decimal(0);
      byBlock.set(block, current.plus(toDecimal(shift.total_with_fk)));
    }
    const expensesByBlock: BlockExpense[] = Array.from(byBlock.entries())
      .map(([block, total]) => ({
        block: block as ReportBlock,
        label: REPORT_BLOCK_LABELS[block as ReportBlock] || block,
        total: toMoneyString(total),
      }));

    // ─── Widget 6: Expenses by day ───
    const byDay = new Map<string, Decimal>();
    for (const shift of periodShifts) {
      const current = byDay.get(shift.date) || new Decimal(0);
      byDay.set(shift.date, current.plus(toDecimal(shift.total_with_fk)));
    }
    for (const extras of periodExtras) {
      const current = byDay.get(extras.date) || new Decimal(0);
      byDay.set(extras.date, current.plus(toDecimal(extras.grand_total)));
    }
    const expensesByDay: DayExpense[] = Array.from(byDay.entries())
      .map(([date, total]) => ({ date, total: toMoneyString(total) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── Widget 7: Scenes plan vs fact ───
    const timingShifts = await this.timingRepo.findAllShifts({
      project_id: projectId,
    });
    const scenesStats: SceneStats = {
      total_plan: timingShifts.reduce((sum, t) => sum + (t.scenes_plan || 0), 0),
      total_fact: timingShifts.reduce((sum, t) => sum + (t.scenes_fact || 0), 0),
    };

    // ─── Widget 8: Last production report date ───
    const allDates = allShifts.map(s => s.date).sort();
    const lastProductionDate = allDates.length > 0
      ? allDates[allDates.length - 1]
      : null;

    return {
      total_expenses: toMoneyString(totalExpenses),
      shifts_today: shiftsToday,
      shifts_this_week: shiftsThisWeek,
      unfilled_employees: unfilled,
      top_overtime: topOvertime,
      expenses_by_block: expensesByBlock,
      expenses_by_day: expensesByDay,
      scenes_plan_vs_fact: scenesStats,
      last_production_report_date: lastProductionDate,
    };
  }
}
