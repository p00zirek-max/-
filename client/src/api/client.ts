import type { ApiResponse } from '@kinotabel/shared';

/**
 * API base URL.
 * - Development: '/api' (proxied by Vite dev server to localhost:3000)
 * - Production (GitHub Pages → Cloud Functions): full URL from env variable
 *   e.g. 'https://europe-west1-my-project.cloudfunctions.net/kinotabel-api/api'
 */
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

/** Demo mode: API not available, return empty data instead of throwing */
const DEMO_MODE = !import.meta.env.VITE_API_URL && !import.meta.env.VITE_FIREBASE_PROJECT_ID;

/** Demo fallback: return empty data matching expected shape */
const DEMO_RESPONSES: Record<string, unknown> = {
  '/dashboard/overview': {
    total_expenses: 0, total_expenses_trend: 0,
    shifts_today: 0, shifts_week: 0,
    unfilled: [], overtime_top: [],
    expenses_by_block: [], daily_expenses: [],
    scenes_plan: 0, scenes_fact: 0,
    latest_report_date: null,
  },
  '/shifts': [],
  '/employees': [],
  '/extras': [],
  '/timing/shifts': [],
  '/timing/scenes': [],
  '/timing/draft': null,
  '/locations': [],
  '/expenses': [],
  '/reports/summary': { rows: [], totals: {} },
  '/reports/individual': { employee: null, shifts: [], totals: {} },
  '/reports/by-position': [],
};

function getDemoResponse<T>(endpoint: string): T {
  // Match endpoint patterns
  for (const [pattern, data] of Object.entries(DEMO_RESPONSES)) {
    if (endpoint.startsWith(pattern)) return data as T;
  }
  // Default: production report
  if (endpoint.startsWith('/reports/production')) {
    return { date: '', shift_number: 0, sections: [], info: null } as T;
  }
  return [] as T;
}

/** Get auth token from store or localStorage */
function getAuthToken(): string | null {
  // Firebase token or personal session token
  return localStorage.getItem('kinotabel-auth-token');
}

/** Get personal form token (for employee links) */
function getPersonalToken(): string | null {
  return localStorage.getItem('kinotabel-personal-token');
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: string,
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | string[] | number | boolean | undefined | null>;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, headers: customHeaders, ...rest } = options;

  // Build URL with query params
  const url = new URL(`${BASE_URL}${endpoint}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        url.searchParams.set(key, value.join(','));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const authToken = getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const personalToken = getPersonalToken();
  if (personalToken) {
    headers['X-Personal-Token'] = personalToken;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...rest,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Network error (API unreachable)
    if (DEMO_MODE) {
      console.warn(`[Demo] API unavailable: ${endpoint}`);
      return getDemoResponse<T>(endpoint);
    }
    throw err;
  }

  if (!response.ok) {
    if (DEMO_MODE) {
      console.warn(`[Demo] API ${response.status}: ${endpoint}`);
      return getDemoResponse<T>(endpoint);
    }
    const text = await response.text().catch(() => '');
    throw new ApiError(response.status, response.statusText, text);
  }

  // Handle empty responses (204)
  if (response.status === 204) {
    return undefined as T;
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.ok && json.error) {
    throw new ApiError(response.status, json.error, json.message);
  }

  return json.data as T;
}

export const api = {
  get<T>(endpoint: string, params?: RequestOptions['params']): Promise<T> {
    return request<T>(endpoint, { method: 'GET', params });
  },

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'POST', body });
  },

  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'PUT', body });
  },

  delete<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};
