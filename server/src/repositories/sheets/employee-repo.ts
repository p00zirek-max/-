/**
 * Google Sheets implementation of IEmployeeRepository.
 */

import type {
  Employee, EmployeePosition, EmployeeWithPositions, EmployeeCategory,
} from '@kinotabel/shared';
import type { RoundingMode, ReportBlock } from '@kinotabel/shared';
import type { IEmployeeRepository, EmployeeFilters } from '../interfaces/employee-repository';
import {
  readSheetCached, appendRow, updateRow, findRowByColumnValue, invalidateCache,
} from './sheets-client';
import { config } from '../../config';

// Column order for _employees sheet
const EMP_COLS = [
  'id', 'project_id', 'name', 'category', 'telegram_chat_id',
  'personal_token', 'payment_type', 'accord_amount', 'is_active',
  'attached_from', 'attached_to', 'created_at',
] as const;

// Column order for _positions sheet
const POS_COLS = [
  'id', 'employee_id', 'position', 'report_block',
  'shift_rate', 'overtime_hourly_rate', 'km_rate', 'unit_rate',
  'fk_percent', 'shift_hours', 'rounding',
  'night_shift_rate', 'night_overtime_rate', 'night_shift_hours',
  'break_hours', 'is_active',
] as const;

function rowToEmployee(row: string[]): Employee {
  return {
    id: row[0] || '',
    project_id: row[1] || '',
    name: row[2] || '',
    category: (row[3] || 'crew') as EmployeeCategory,
    telegram_chat_id: row[4] || null,
    personal_token: row[5] || null,
    payment_type: (row[6] || 'per_shift') as 'per_shift' | 'accord',
    accord_amount: row[7] ? Number(row[7]) : null,
    is_active: row[8] !== 'false',
    attached_from: row[9] || null,
    attached_to: row[10] || null,
    created_at: row[11] || new Date().toISOString(),
  };
}

function employeeToRow(e: Employee): (string | number | boolean | null)[] {
  return [
    e.id, e.project_id, e.name, e.category,
    e.telegram_chat_id, e.personal_token, e.payment_type,
    e.accord_amount, e.is_active, e.attached_from, e.attached_to,
    e.created_at,
  ];
}

function rowToPosition(row: string[]): EmployeePosition {
  return {
    id: row[0] || '',
    employee_id: row[1] || '',
    position: row[2] || '',
    report_block: (row[3] || 'P') as ReportBlock,
    shift_rate: Number(row[4]) || 0,
    overtime_hourly_rate: Number(row[5]) || 0,
    km_rate: Number(row[6]) || 0,
    unit_rate: Number(row[7]) || 0,
    fk_percent: Number(row[8]) || 0,
    shift_hours: Number(row[9]) || 12,
    rounding: (row[10] || 'hour') as RoundingMode,
    night_shift_rate: row[11] ? Number(row[11]) : null,
    night_overtime_rate: row[12] ? Number(row[12]) : null,
    night_shift_hours: row[13] ? Number(row[13]) : null,
    break_hours: Number(row[14]) || 1,
    is_active: row[15] !== 'false',
  };
}

function positionToRow(p: EmployeePosition): (string | number | boolean | null)[] {
  return [
    p.id, p.employee_id, p.position, p.report_block,
    p.shift_rate, p.overtime_hourly_rate, p.km_rate, p.unit_rate,
    p.fk_percent, p.shift_hours, p.rounding,
    p.night_shift_rate, p.night_overtime_rate, p.night_shift_hours,
    p.break_hours, p.is_active,
  ];
}

export class SheetsEmployeeRepository implements IEmployeeRepository {
  private readonly empSheet = config.sheets.employees;
  private readonly posSheet = config.sheets.positions;

  async findAll(filters: EmployeeFilters): Promise<Employee[]> {
    const rows = await readSheetCached(this.empSheet);
    let employees = rows.map(rowToEmployee);

    employees = employees.filter(e => e.project_id === filters.project_id);
    if (filters.category) {
      employees = employees.filter(e => e.category === filters.category);
    }
    if (filters.is_active !== undefined) {
      employees = employees.filter(e => e.is_active === filters.is_active);
    }
    if (filters.report_block) {
      // Need to cross-reference positions
      const posRows = await readSheetCached(this.posSheet);
      const positions = posRows.map(rowToPosition);
      const employeeIds = new Set(
        positions
          .filter(p => p.report_block === filters.report_block)
          .map(p => p.employee_id)
      );
      employees = employees.filter(e => employeeIds.has(e.id));
    }
    return employees;
  }

  async findById(id: string): Promise<Employee | null> {
    const rows = await readSheetCached(this.empSheet);
    const row = rows.find(r => r[0] === id);
    return row ? rowToEmployee(row) : null;
  }

  async findByIdWithPositions(id: string): Promise<EmployeeWithPositions | null> {
    const employee = await this.findById(id);
    if (!employee) return null;

    const positions = await this.getPositions(id);
    return { ...employee, positions };
  }

  async create(employee: Omit<Employee, 'created_at'>): Promise<Employee> {
    const full: Employee = {
      ...employee,
      created_at: new Date().toISOString(),
    } as Employee;
    await appendRow(this.empSheet, employeeToRow(full));
    invalidateCache(this.empSheet);
    return full;
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    const rowNum = await findRowByColumnValue(this.empSheet, 0, id);
    if (rowNum === -1) throw new Error(`Employee ${id} not found`);

    const existing = await this.findById(id);
    if (!existing) throw new Error(`Employee ${id} not found`);

    const updated = { ...existing, ...data, id };
    await updateRow(this.empSheet, rowNum, employeeToRow(updated));
    invalidateCache(this.empSheet);
    return updated;
  }

  async getPositions(employeeId: string): Promise<EmployeePosition[]> {
    const rows = await readSheetCached(this.posSheet);
    return rows.filter(r => r[1] === employeeId).map(rowToPosition);
  }

  async getPositionById(positionId: string): Promise<EmployeePosition | null> {
    const rows = await readSheetCached(this.posSheet);
    const row = rows.find(r => r[0] === positionId);
    return row ? rowToPosition(row) : null;
  }

  async addPosition(position: EmployeePosition): Promise<EmployeePosition> {
    await appendRow(this.posSheet, positionToRow(position));
    invalidateCache(this.posSheet);
    return position;
  }

  async updatePosition(
    positionId: string,
    data: Partial<EmployeePosition>,
  ): Promise<EmployeePosition> {
    const rowNum = await findRowByColumnValue(this.posSheet, 0, positionId);
    if (rowNum === -1) throw new Error(`Position ${positionId} not found`);

    const existing = await this.getPositionById(positionId);
    if (!existing) throw new Error(`Position ${positionId} not found`);

    const updated = { ...existing, ...data, id: positionId };
    await updateRow(this.posSheet, rowNum, positionToRow(updated));
    invalidateCache(this.posSheet);
    return updated;
  }
}
