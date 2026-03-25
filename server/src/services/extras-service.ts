/**
 * Extras (АМС) Service — CRUD + automatic calculation.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Extras, ExtrasInput } from '@kinotabel/shared';
import { getExtrasRepository } from '../repositories';
import { calculateExtras } from './calculation-engine';
import type { ExtrasFilters } from '../repositories/interfaces/extras-repository';

export class ExtrasService {
  private readonly repo = getExtrasRepository();

  async getAll(filters: ExtrasFilters): Promise<Extras[]> {
    return this.repo.findAll(filters);
  }

  async getById(id: string): Promise<Extras | null> {
    return this.repo.findById(id);
  }

  async create(input: ExtrasInput): Promise<Extras> {
    const calc = calculateExtras({
      shift_start: input.shift_start,
      shift_end: input.shift_end,
      days_in_shift: input.days_in_shift || 0,
      quantity: input.quantity,
      rate: input.rate,
      overtime_rate: input.overtime_rate,
      shift_hours: input.shift_hours,
      rounding: input.rounding,
    });

    const extras: Extras = {
      ...input,
      id: uuidv4(),
      days_in_shift: input.days_in_shift || 0,
      overtime_hours: calc.overtime_hours,
      shift_total: calc.shift_total,
      overtime_total: calc.overtime_total,
      grand_total: calc.grand_total,
    };

    return this.repo.create(extras);
  }

  async update(id: string, input: Partial<ExtrasInput>): Promise<Extras> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`Extras ${id} not found`);

    const merged = { ...existing, ...input };

    const calc = calculateExtras({
      shift_start: merged.shift_start,
      shift_end: merged.shift_end,
      days_in_shift: merged.days_in_shift || 0,
      quantity: merged.quantity,
      rate: merged.rate,
      overtime_rate: merged.overtime_rate,
      shift_hours: merged.shift_hours,
      rounding: merged.rounding,
    });

    return this.repo.update(id, {
      ...input,
      overtime_hours: calc.overtime_hours,
      shift_total: calc.shift_total,
      overtime_total: calc.overtime_total,
      grand_total: calc.grand_total,
    });
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
