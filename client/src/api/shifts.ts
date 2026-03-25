import { api } from './client';
import type { Shift, ShiftInput, ShiftCalculation } from '@kinotabel/shared';

export interface ShiftFilters {
  project_id?: string;
  employee_id?: string;
  position_id?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
}

export const shiftsApi = {
  getShifts(filters?: ShiftFilters): Promise<Shift[]> {
    return api.get<Shift[]>('/shifts', filters as Record<string, string>);
  },

  getShift(id: string): Promise<Shift> {
    return api.get<Shift>(`/shifts/${id}`);
  },

  createShift(input: ShiftInput): Promise<Shift & { calculation: ShiftCalculation }> {
    return api.post('/shifts', input);
  },

  updateShift(id: string, input: Partial<ShiftInput>): Promise<Shift & { calculation: ShiftCalculation }> {
    return api.put(`/shifts/${id}`, input);
  },

  deleteShift(id: string): Promise<void> {
    return api.delete(`/shifts/${id}`);
  },

  lockShift(id: string): Promise<Shift> {
    return api.post(`/shifts/${id}/lock`);
  },

  unlockShift(id: string): Promise<Shift> {
    return api.post(`/shifts/${id}/unlock`);
  },
};
