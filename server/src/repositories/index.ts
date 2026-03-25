/**
 * Repository factory — returns the appropriate implementation.
 * MVP: Google Sheets. Later: swap to PostgreSQL by changing imports here.
 */

import type { IEmployeeRepository } from './interfaces/employee-repository';
import type { IShiftRepository } from './interfaces/shift-repository';
import type { IExtrasRepository } from './interfaces/extras-repository';
import type { ITimingRepository } from './interfaces/timing-repository';
import type { ILocationRepository } from './interfaces/location-repository';
import type { IExpenseRepository } from './interfaces/expense-repository';

import { SheetsEmployeeRepository } from './sheets/employee-repo';
import { SheetsShiftRepository } from './sheets/shift-repo';
import { SheetsExtrasRepository } from './sheets/extras-repo';
import { SheetsTimingRepository } from './sheets/timing-repo';
import { SheetsLocationRepository } from './sheets/location-repo';
import { SheetsExpenseRepository } from './sheets/expense-repo';

// Singleton instances
let employeeRepo: IEmployeeRepository | null = null;
let shiftRepo: IShiftRepository | null = null;
let extrasRepo: IExtrasRepository | null = null;
let timingRepo: ITimingRepository | null = null;
let locationRepo: ILocationRepository | null = null;
let expenseRepo: IExpenseRepository | null = null;

export function getEmployeeRepository(): IEmployeeRepository {
  if (!employeeRepo) employeeRepo = new SheetsEmployeeRepository();
  return employeeRepo;
}

export function getShiftRepository(): IShiftRepository {
  if (!shiftRepo) shiftRepo = new SheetsShiftRepository();
  return shiftRepo;
}

export function getExtrasRepository(): IExtrasRepository {
  if (!extrasRepo) extrasRepo = new SheetsExtrasRepository();
  return extrasRepo;
}

export function getTimingRepository(): ITimingRepository {
  if (!timingRepo) timingRepo = new SheetsTimingRepository();
  return timingRepo;
}

export function getLocationRepository(): ILocationRepository {
  if (!locationRepo) locationRepo = new SheetsLocationRepository();
  return locationRepo;
}

export function getExpenseRepository(): IExpenseRepository {
  if (!expenseRepo) expenseRepo = new SheetsExpenseRepository();
  return expenseRepo;
}

// Re-export interfaces
export type { IEmployeeRepository } from './interfaces/employee-repository';
export type { IShiftRepository } from './interfaces/shift-repository';
export type { IExtrasRepository } from './interfaces/extras-repository';
export type { ITimingRepository } from './interfaces/timing-repository';
export type { ILocationRepository } from './interfaces/location-repository';
export type { IExpenseRepository } from './interfaces/expense-repository';
