/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: ApiMeta;
}

/** Pagination metadata */
export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
}

/** Paginated list response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  per_page: number;
}

/** Shift creation/update request */
export interface CreateShiftRequest {
  project_id: string;
  employee_id: string;
  position_id: string;
  location_id?: string | null;
  date: string;
  shift_start: string;
  shift_end: string;
  days_in_shift: number;
  lunch_current: boolean;
  lunch_late: boolean;
  lunch_none: boolean;
  is_night: boolean;
  coefficient: number;     // 1.0 / 0.5 / 2.0
  address?: string;
  overtime_km: number;
  unit_quantity: number;
  comment?: string;
}

/** Report query parameters */
export interface ReportQuery {
  project_id: string;
  employee_ids?: string;    // comma-separated
  position_ids?: string;    // comma-separated
  date_from?: string;
  date_to?: string;
  months?: string;          // comma-separated, e.g. "2026-03,2026-04"
}

/** Dashboard query parameters */
export interface DashboardQuery {
  project_id: string;
  date_from?: string;
  date_to?: string;
}
