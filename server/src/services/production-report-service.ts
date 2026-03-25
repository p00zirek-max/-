/**
 * Production Report Service — generates daily production report (D-029).
 *
 * Groups shifts by report_block and assembles timing, scenes,
 * extras, and location data for a given date.
 */

import type {
  ProductionReport, ProductionReportBlock, ProductionReportItem,
  ReportBlock,
} from '@kinotabel/shared';
import { REPORT_BLOCK_LABELS, REPORT_BLOCK_ORDER } from '@kinotabel/shared';
import {
  getShiftRepository, getEmployeeRepository,
  getTimingRepository, getExtrasRepository, getLocationRepository,
} from '../repositories';

export class ProductionReportService {
  private readonly shiftRepo = getShiftRepository();
  private readonly empRepo = getEmployeeRepository();
  private readonly timingRepo = getTimingRepository();
  private readonly extrasRepo = getExtrasRepository();
  private readonly locationRepo = getLocationRepository();

  /**
   * Generate production report for a specific date (D-029, D-030).
   */
  async getProductionReport(
    projectId: string,
    date: string,
  ): Promise<ProductionReport> {
    // 1. Timing shift for the date
    const timingShifts = await this.timingRepo.findAllShifts({
      project_id: projectId,
      date,
    });
    const timing = timingShifts[0] || null;

    // 2. Timing scenes
    const scenes = timing
      ? await this.timingRepo.findScenesByShiftId(timing.id)
      : [];

    // 3. Shifts for the date, grouped by report_block
    const shifts = await this.shiftRepo.findAll({
      project_id: projectId,
      date,
    });

    // Build blocks
    const blocks: Record<string, ProductionReportBlock> = {};

    for (const blockCode of REPORT_BLOCK_ORDER) {
      blocks[blockCode] = {
        label: REPORT_BLOCK_LABELS[blockCode],
        items: [],
      };
    }

    for (const shift of shifts) {
      const position = await this.empRepo.getPositionById(shift.position_id);
      if (!position) continue;

      const employee = await this.empRepo.findById(shift.employee_id);
      if (!employee) continue;

      const block = position.report_block;
      if (!blocks[block]) {
        blocks[block] = {
          label: REPORT_BLOCK_LABELS[block as ReportBlock] || block,
          items: [],
        };
      }

      blocks[block].items.push({
        employee_id: employee.id,
        employee_name: employee.name,
        position: position.position,
        shift_rate: position.shift_rate,
        shift_start: shift.shift_start,
        shift_end: shift.shift_end,
        overtime_hours: shift.overtime_hours,
        overtime_km: shift.overtime_km,
        total_amount: shift.total_amount,
      });
    }

    // 4. Extras for the date
    const extras = await this.extrasRepo.findAll({
      project_id: projectId,
      date,
    });

    // 5. Locations for the date
    const locations = await this.locationRepo.findAll({
      project_id: projectId,
      date,
    });

    return {
      project_id: projectId,
      date,
      shift_number: timing?.shift_number || 0,
      project_name: '',  // TODO: fetch from projects table
      director: '',
      cameraman: '',
      timing,
      scenes,
      blocks: blocks as Record<ReportBlock, ProductionReportBlock>,
      extras,
      locations,
    };
  }
}
