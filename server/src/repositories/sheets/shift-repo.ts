/**
 * Google Sheets implementation of IShiftRepository.
 */

import type { Shift, ShiftCoefficient } from '@kinotabel/shared';
import type { IShiftRepository, ShiftFilters } from '../interfaces/shift-repository';
import {
  readSheetCached, appendRow, updateRow, deleteRow,
  findRowByColumnValue, invalidateCache,
} from './sheets-client';
import { config } from '../../config';
import { dateInRange, dateInMonth } from '../../utils/time';

// Column order for _shifts sheet
const SHIFT_COLS = [
  'id', 'project_id', 'employee_id', 'position_id', 'location_id',
  'date', 'shift_number', 'shift_start', 'shift_end', 'days_in_shift',
  'lunch_current', 'lunch_late', 'lunch_none',
  'is_night', 'coefficient', 'address', 'overtime_km', 'unit_quantity',
  'comment', 'locked', 'submitted_at',
  // Calculated fields
  'overtime_hours', 'shift_amount', 'overtime_amount',
  'km_amount', 'unit_amount', 'total_amount', 'total_with_fk',
] as const;

function rowToShift(row: string[]): Shift {
  return {
    id: row[0] || '',
    project_id: row[1] || '',
    employee_id: row[2] || '',
    position_id: row[3] || '',
    location_id: row[4] || null,
    date: row[5] || '',
    shift_number: row[6] ? Number(row[6]) : undefined,
    shift_start: row[7] || '',
    shift_end: row[8] || '',
    days_in_shift: Number(row[9]) || 0,
    lunch_current: row[10] === 'true',
    lunch_late: row[11] === 'true',
    lunch_none: row[12] === 'true',
    is_night: row[13] === 'true',
    coefficient: Number(row[14]) as ShiftCoefficient || 1,
    address: row[15] || '',
    overtime_km: Number(row[16]) || 0,
    unit_quantity: Number(row[17]) || 0,
    comment: row[18] || '',
    locked: row[19] === 'true',
    submitted_at: row[20] || '',
    overtime_hours: Number(row[21]) || 0,
    shift_amount: row[22] || '0.00',
    overtime_amount: row[23] || '0.00',
    km_amount: row[24] || '0.00',
    unit_amount: row[25] || '0.00',
    total_amount: row[26] || '0.00',
    total_with_fk: row[27] || '0.00',
  };
}

function shiftToRow(s: Shift): (string | number | boolean | null)[] {
  return [
    s.id, s.project_id, s.employee_id, s.position_id, s.location_id ?? '',
    s.date, s.shift_number ?? '', s.shift_start, s.shift_end, s.days_in_shift,
    s.lunch_current, s.lunch_late, s.lunch_none,
    s.is_night, s.coefficient, s.address ?? '', s.overtime_km, s.unit_quantity,
    s.comment ?? '', s.locked, s.submitted_at,
    s.overtime_hours, s.shift_amount, s.overtime_amount,
    s.km_amount, s.unit_amount, s.total_amount, s.total_with_fk,
  ];
}

export class SheetsShiftRepository implements IShiftRepository {
  private readonly sheet = config.sheets.shifts;

  async findAll(filters: ShiftFilters): Promise<Shift[]> {
    const rows = await readSheetCached(this.sheet);
    let shifts = rows.map(rowToShift);

    shifts = shifts.filter(s => s.project_id === filters.project_id);

    if (filters.employee_id) {
      shifts = shifts.filter(s => s.employee_id === filters.employee_id);
    }
    if (filters.position_id) {
      shifts = shifts.filter(s => s.position_id === filters.position_id);
    }
    if (filters.date) {
      shifts = shifts.filter(s => s.date === filters.date);
    }
    if (filters.date_from || filters.date_to) {
      shifts = shifts.filter(s =>
        dateInRange(s.date, filters.date_from, filters.date_to)
      );
    }
    if (filters.months && filters.months.length > 0) {
      shifts = shifts.filter(s =>
        filters.months!.some(m => dateInMonth(s.date, m))
      );
    }
    if (filters.locked !== undefined) {
      shifts = shifts.filter(s => s.locked === filters.locked);
    }

    return shifts;
  }

  async findById(id: string): Promise<Shift | null> {
    const rows = await readSheetCached(this.sheet);
    const row = rows.find(r => r[0] === id);
    return row ? rowToShift(row) : null;
  }

  async create(shift: Shift): Promise<Shift> {
    await appendRow(this.sheet, shiftToRow(shift));
    invalidateCache(this.sheet);
    return shift;
  }

  async update(id: string, data: Partial<Shift>): Promise<Shift> {
    const rowNum = await findRowByColumnValue(this.sheet, 0, id);
    if (rowNum === -1) throw new Error(`Shift ${id} not found`);

    const existing = await this.findById(id);
    if (!existing) throw new Error(`Shift ${id} not found`);

    const updated = { ...existing, ...data, id } as Shift;
    await updateRow(this.sheet, rowNum, shiftToRow(updated));
    invalidateCache(this.sheet);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const rowNum = await findRowByColumnValue(this.sheet, 0, id);
    if (rowNum === -1) throw new Error(`Shift ${id} not found`);

    await deleteRow(this.sheet, rowNum);
    invalidateCache(this.sheet);
  }

  async lock(id: string): Promise<void> {
    await this.update(id, { locked: true });
  }

  async unlock(id: string): Promise<void> {
    await this.update(id, { locked: false });
  }
}
