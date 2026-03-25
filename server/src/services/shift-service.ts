/**
 * Shift Service — CRUD operations with automatic calculation via engine.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Shift, ShiftInput, ShiftCoefficient } from '@kinotabel/shared';
import { getShiftRepository, getEmployeeRepository } from '../repositories';
import { calculateShift } from './calculation-engine';
import type { ShiftFilters } from '../repositories/interfaces/shift-repository';

export class ShiftService {
  private readonly shiftRepo = getShiftRepository();
  private readonly empRepo = getEmployeeRepository();

  /**
   * Get shifts with filters.
   */
  async getShifts(filters: ShiftFilters): Promise<Shift[]> {
    return this.shiftRepo.findAll(filters);
  }

  /**
   * Get a single shift by ID.
   */
  async getShiftById(id: string): Promise<Shift | null> {
    return this.shiftRepo.findById(id);
  }

  /**
   * Create a new shift with automatic calculation.
   */
  async createShift(input: ShiftInput): Promise<Shift> {
    // Get position for rates
    const position = await this.empRepo.getPositionById(input.position_id);
    if (!position) {
      throw new Error(`Position ${input.position_id} not found`);
    }

    // Calculate via engine
    const calc = calculateShift(
      {
        shift_start: input.shift_start,
        shift_end: input.shift_end,
        days_in_shift: input.days_in_shift,
        lunch_current: input.lunch_current,
        lunch_late: input.lunch_late,
        lunch_none: input.lunch_none,
        is_night: input.is_night,
        coefficient: input.coefficient,
        overtime_km: input.overtime_km,
        unit_quantity: input.unit_quantity,
      },
      position,
    );

    const shift: Shift = {
      ...input,
      id: uuidv4(),
      overtime_hours: calc.overtime_hours,
      shift_amount: calc.shift_amount,
      overtime_amount: calc.overtime_amount,
      km_amount: calc.km_amount,
      unit_amount: calc.unit_amount,
      total_amount: calc.total_amount,
      total_with_fk: calc.total_with_fk,
      locked: false,
      submitted_at: new Date().toISOString(),
    };

    return this.shiftRepo.create(shift);
  }

  /**
   * Update a shift and recalculate.
   */
  async updateShift(id: string, input: Partial<ShiftInput>): Promise<Shift> {
    const existing = await this.shiftRepo.findById(id);
    if (!existing) throw new Error(`Shift ${id} not found`);
    if (existing.locked) throw new Error(`Shift ${id} is locked`);

    const merged = { ...existing, ...input };

    // Re-fetch position for recalculation
    const position = await this.empRepo.getPositionById(merged.position_id);
    if (!position) throw new Error(`Position ${merged.position_id} not found`);

    const calc = calculateShift(
      {
        shift_start: merged.shift_start,
        shift_end: merged.shift_end,
        days_in_shift: merged.days_in_shift,
        lunch_current: merged.lunch_current,
        lunch_late: merged.lunch_late,
        lunch_none: merged.lunch_none,
        is_night: merged.is_night,
        coefficient: merged.coefficient as ShiftCoefficient,
        overtime_km: merged.overtime_km,
        unit_quantity: merged.unit_quantity,
      },
      position,
    );

    return this.shiftRepo.update(id, {
      ...input,
      overtime_hours: calc.overtime_hours,
      shift_amount: calc.shift_amount,
      overtime_amount: calc.overtime_amount,
      km_amount: calc.km_amount,
      unit_amount: calc.unit_amount,
      total_amount: calc.total_amount,
      total_with_fk: calc.total_with_fk,
    });
  }

  /**
   * Delete a shift (only if not locked).
   */
  async deleteShift(id: string): Promise<void> {
    const shift = await this.shiftRepo.findById(id);
    if (!shift) throw new Error(`Shift ${id} not found`);
    if (shift.locked) throw new Error(`Shift ${id} is locked`);

    return this.shiftRepo.delete(id);
  }

  /**
   * Lock a shift.
   */
  async lockShift(id: string): Promise<void> {
    return this.shiftRepo.lock(id);
  }

  /**
   * Unlock a shift (admin only — caller should verify role).
   */
  async unlockShift(id: string): Promise<void> {
    return this.shiftRepo.unlock(id);
  }
}
