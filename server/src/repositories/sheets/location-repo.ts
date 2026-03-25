/**
 * Google Sheets implementation of ILocationRepository.
 */

import type { Location } from '@kinotabel/shared';
import type { RoundingMode } from '@kinotabel/shared';
import type { ILocationRepository, LocationFilters } from '../interfaces/location-repository';
import {
  readSheetCached, appendRow, updateRow, findRowByColumnValue, invalidateCache,
} from './sheets-client';
import { config } from '../../config';
import { dateInRange } from '../../utils/time';

function rowToLocation(row: string[]): Location {
  return {
    id: row[0] || '',
    project_id: row[1] || '',
    date: row[2] || '',
    address: row[3] || '',
    object_name: row[4] || '',
    shift_rate: Number(row[5]) || 0,
    overtime_hourly_rate: Number(row[6]) || 0,
    shift_hours: Number(row[7]) || 12,
    rounding: (row[8] || 'hour') as RoundingMode,
    shift_start: row[9] || '',
    shift_end: row[10] || '',
    overtime_hours: Number(row[11]) || 0,
    overtime_amount: row[12] || '0.00',
    total_amount: row[13] || '0.00',
    comment: row[14] || null,
  };
}

function locationToRow(l: Location): (string | number | boolean | null)[] {
  return [
    l.id, l.project_id, l.date, l.address, l.object_name,
    l.shift_rate, l.overtime_hourly_rate, l.shift_hours, l.rounding,
    l.shift_start, l.shift_end,
    l.overtime_hours, l.overtime_amount, l.total_amount,
    l.comment,
  ];
}

export class SheetsLocationRepository implements ILocationRepository {
  private readonly sheet = config.sheets.locations;

  async findAll(filters: LocationFilters): Promise<Location[]> {
    const rows = await readSheetCached(this.sheet);
    let items = rows.map(rowToLocation);

    items = items.filter(l => l.project_id === filters.project_id);
    if (filters.date) {
      items = items.filter(l => l.date === filters.date);
    }
    if (filters.date_from || filters.date_to) {
      items = items.filter(l =>
        dateInRange(l.date, filters.date_from, filters.date_to)
      );
    }
    return items;
  }

  async findById(id: string): Promise<Location | null> {
    const rows = await readSheetCached(this.sheet);
    const row = rows.find(r => r[0] === id);
    return row ? rowToLocation(row) : null;
  }

  async create(location: Location): Promise<Location> {
    await appendRow(this.sheet, locationToRow(location));
    invalidateCache(this.sheet);
    return location;
  }

  async update(id: string, data: Partial<Location>): Promise<Location> {
    const rowNum = await findRowByColumnValue(this.sheet, 0, id);
    if (rowNum === -1) throw new Error(`Location ${id} not found`);

    const existing = await this.findById(id);
    if (!existing) throw new Error(`Location ${id} not found`);

    const updated = { ...existing, ...data, id } as Location;
    await updateRow(this.sheet, rowNum, locationToRow(updated));
    invalidateCache(this.sheet);
    return updated;
  }
}
