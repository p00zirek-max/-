/** Expense record (авансовый отчёт) */
export interface Expense {
  id: string;
  employee_id: string;
  project_id: string;
  date: string;             // ISO date
  description: string;
  amount_in: string;        // decimal string — приход
  amount_spent: string;     // decimal string — расход
  balance: string;          // decimal string — остаток
}

/** Expense input */
export interface ExpenseInput {
  employee_id: string;
  project_id: string;
  date: string;
  description: string;
  amount_in: number;
  amount_spent: number;
}
