/**
 * Google Sheets implementation of IExpenseRepository.
 */

import type { Expense } from '@kinotabel/shared';
import type { IExpenseRepository, ExpenseFilters } from '../interfaces/expense-repository';
import {
  readSheetCached, appendRow, updateRow, findRowByColumnValue, invalidateCache,
} from './sheets-client';
import { config } from '../../config';
import { dateInRange } from '../../utils/time';

function rowToExpense(row: string[]): Expense {
  return {
    id: row[0] || '',
    employee_id: row[1] || '',
    project_id: row[2] || '',
    date: row[3] || '',
    description: row[4] || '',
    amount_in: row[5] || '0.00',
    amount_spent: row[6] || '0.00',
    balance: row[7] || '0.00',
  };
}

function expenseToRow(e: Expense): (string | number | boolean | null)[] {
  return [
    e.id, e.employee_id, e.project_id, e.date,
    e.description, e.amount_in, e.amount_spent, e.balance,
  ];
}

export class SheetsExpenseRepository implements IExpenseRepository {
  private readonly sheet = config.sheets.expenses;

  async findAll(filters: ExpenseFilters): Promise<Expense[]> {
    const rows = await readSheetCached(this.sheet);
    let items = rows.map(rowToExpense);

    items = items.filter(e => e.project_id === filters.project_id);
    if (filters.employee_id) {
      items = items.filter(e => e.employee_id === filters.employee_id);
    }
    if (filters.date_from || filters.date_to) {
      items = items.filter(e =>
        dateInRange(e.date, filters.date_from, filters.date_to)
      );
    }
    return items;
  }

  async findById(id: string): Promise<Expense | null> {
    const rows = await readSheetCached(this.sheet);
    const row = rows.find(r => r[0] === id);
    return row ? rowToExpense(row) : null;
  }

  async create(expense: Expense): Promise<Expense> {
    await appendRow(this.sheet, expenseToRow(expense));
    invalidateCache(this.sheet);
    return expense;
  }

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const rowNum = await findRowByColumnValue(this.sheet, 0, id);
    if (rowNum === -1) throw new Error(`Expense ${id} not found`);

    const existing = await this.findById(id);
    if (!existing) throw new Error(`Expense ${id} not found`);

    const updated = { ...existing, ...data, id } as Expense;
    await updateRow(this.sheet, rowNum, expenseToRow(updated));
    invalidateCache(this.sheet);
    return updated;
  }
}
