import type { Shift } from '@kinotabel/shared';

export interface ShiftFilters {
  project_id: string;
  employee_id?: string;
  position_id?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  months?: string[];        // e.g. ["2026-03"]
  locked?: boolean;
}

export interface IShiftRepository {
  /** Get shifts matching filters */
  findAll(filters: ShiftFilters): Promise<Shift[]>;

  /** Get shift by ID */
  findById(id: string): Promise<Shift | null>;

  /** Create new shift */
  create(shift: Shift): Promise<Shift>;

  /** Update shift (replaces calculated fields too) */
  update(id: string, data: Partial<Shift>): Promise<Shift>;

  /** Delete shift */
  delete(id: string): Promise<void>;

  /** Lock a shift */
  lock(id: string): Promise<void>;

  /** Unlock a shift */
  unlock(id: string): Promise<void>;
}
