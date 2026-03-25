import type { Employee, EmployeePosition, EmployeeWithPositions, EmployeeCategory } from '@kinotabel/shared';

export interface EmployeeFilters {
  project_id: string;
  category?: EmployeeCategory;
  is_active?: boolean;
  report_block?: string;
}

export interface IEmployeeRepository {
  /** Get all employees matching filters */
  findAll(filters: EmployeeFilters): Promise<Employee[]>;

  /** Get employee by ID */
  findById(id: string): Promise<Employee | null>;

  /** Get employee with all positions */
  findByIdWithPositions(id: string): Promise<EmployeeWithPositions | null>;

  /** Create new employee */
  create(employee: Omit<Employee, 'created_at'>): Promise<Employee>;

  /** Update employee */
  update(id: string, data: Partial<Employee>): Promise<Employee>;

  /** Get all positions for an employee */
  getPositions(employeeId: string): Promise<EmployeePosition[]>;

  /** Get a specific position by ID */
  getPositionById(positionId: string): Promise<EmployeePosition | null>;

  /** Add a position to an employee */
  addPosition(position: EmployeePosition): Promise<EmployeePosition>;

  /** Update a position */
  updatePosition(positionId: string, data: Partial<EmployeePosition>): Promise<EmployeePosition>;
}
