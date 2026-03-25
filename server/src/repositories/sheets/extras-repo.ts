/**
 * Google Sheets implementation of IExtrasRepository.
 */

import type { Extras } from '@kinotabel/shared';
import type { RoundingMode } from '@kinotabel/shared';
import type { IExtrasRepository, ExtrasFilters } from '../interfaces/extras-repository';
import {
  readSheetCached, appendRow, updateRow, deleteRow,
  findRowByColumnValue, invalidateCache,
} from './sheets-client';
import { config } from '../../config';
import { dateInRange } from '../../utils/time';

const EXTRAS_COLS = [
  'id', 'project_id', 'date', 'role', 'quantity', 'rate',
  'overtime_rate', 'shift_hours', 'rounding',
  'shift_start', 'shift_end', 'days_in_shift', 'comment',
  // Calculated
  'overtime_hours', 'shift_total', 'overtime_total', 'grand_total',
] as const;

function rowToExtras(row: string[]): Extras {
  return {
    id: row[0] || '',
    project_id: row[1] || '',
    date: row[2] || '',
    role: row[3] || '',
    quantity: Number(row[4]) || 0,
    rate: Number(row[5]) || 0,
    overtime_rate: Number(row[6]) || 0,
    shift_hours: Number(row[7]) || 12,
    rounding: (row[8] || 'hour') as RoundingMode,
    shift_start: row[9] || '',
    shift_end: row[10] || '',
    days_in_shift: Number(row[11]) || 0,
    comment: row[12] || '',
    overtime_hours: Number(row[13]) || 0,
    shift_total: row[14] || '0.00',
    overtime_total: row[15] || '0.00',
    grand_total: row[16] || '0.00',
  };
}

function extrasToRow(e: Extras): (string | number | boolean | null)[] {
  return [
    e.id, e.project_id, e.date, e.role, e.quantity, e.rate,
    e.overtime_rate, e.shift_hours, e.rounding,
    e.shift_start, e.shift_end, e.days_in_shift ?? 0, e.comment ?? '',
    e.overtime_hours, e.shift_total, e.overtime_total, e.grand_total,
  ];
}

export class SheetsExtrasRepository implements IExtrasRepository {
  private readonly sheet = config.sheets.extras;

  async findAll(filters: ExtrasFilters): Promise<Extras[]> {
    const rows = await readSheetCached(this.sheet);
    let items = rows.map(rowToExtras);

    items = items.filter(e => e.project_id === filters.project_id);
    if (filters.date) {
      items = items.filter(e => e.date === filters.date);
    }
    if (filters.date_from || filters.date_to) {
      items = items.filter(e =>
        dateInRange(e.date, filters.date_from, filters.date_to)
      );
    }
    return items;
  }

  async findById(id: string): Promise<Extras | null> {
    const rows = await readSheetCached(this.sheet);
    const row = rows.find(r => r[0] === id);
    return row ? rowToExtras(row) : null;
  }

  async create(extras: Extras): Promise<Extras> {
    await appendRow(this.sheet, extrasToRow(extras));
    invalidateCache(this.sheet);
    return extras;
  }

  async update(id: string, data: Partial<Extras>): Promise<Extras> {
    const rowNum = await findRowByColumnValue(this.sheet, 0, id);
    if (rowNum === -1) throw new Error(`Extras ${id} not found`);

    const existing = await this.findById(id);
    if (!existing) throw new Error(`Extras ${id} not found`);

    const updated = { ...existing, ...data, id } as Extras;
    await updateRow(this.sheet, rowNum, extrasToRow(updated));
    invalidateCache(this.sheet);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const rowNum = await findRowByColumnValue(this.sheet, 0, id);
    if (rowNum === -1) throw new Error(`Extras ${id} not found`);

    await deleteRow(this.sheet, rowNum);
    invalidateCache(this.sheet);
  }
}
