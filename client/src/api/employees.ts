import { api } from './client';
import type { Employee, EmployeeWithPositions, EmployeePosition } from '@kinotabel/shared';

export interface EmployeeFilters {
  project_id?: string;
  category?: string;
  is_active?: boolean;
  block?: string;
}

export const employeesApi = {
  getEmployees(filters?: EmployeeFilters): Promise<EmployeeWithPositions[]> {
    return api.get<EmployeeWithPositions[]>('/employees', filters as Record<string, string>);
  },

  getEmployee(id: string): Promise<EmployeeWithPositions> {
    return api.get<EmployeeWithPositions>(`/employees/${id}`);
  },

  createEmployee(data: Omit<Employee, 'id' | 'created_at' | 'personal_token'>): Promise<Employee> {
    return api.post('/employees', data);
  },

  updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    return api.put(`/employees/${id}`, data);
  },

  addPosition(employeeId: string, position: Omit<EmployeePosition, 'id' | 'employee_id'>): Promise<EmployeePosition> {
    return api.post(`/employees/${employeeId}/positions`, position);
  },

  updatePosition(employeeId: string, positionId: string, data: Partial<EmployeePosition>): Promise<EmployeePosition> {
    return api.put(`/employees/${employeeId}/positions/${positionId}`, data);
  },

  regenerateToken(employeeId: string): Promise<{ personal_token: string }> {
    return api.post(`/employees/${employeeId}/regenerate-token`);
  },
};
