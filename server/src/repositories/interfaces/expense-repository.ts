import type { Expense } from '@kinotabel/shared';

export interface ExpenseFilters {
  project_id: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface IExpenseRepository {
  findAll(filters: ExpenseFilters): Promise<Expense[]>;
  findById(id: string): Promise<Expense | null>;
  create(expense: Expense): Promise<Expense>;
  update(id: string, data: Partial<Expense>): Promise<Expense>;
}
