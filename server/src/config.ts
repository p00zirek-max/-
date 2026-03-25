import path from 'path';

export const config = {
  /** Google Sheets spreadsheet ID (the DB) */
  spreadsheetId: process.env.SPREADSHEET_ID || '1hMYxHm4voBIulIeU0JicB0Co4FhvvxLR42PrRVHlZWA',

  /** Path to Google service account credentials */
  credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH
    || path.resolve(process.cwd(), 'credentials.json'),

  /** Google credentials JSON (for Vercel — pass as env var) */
  credentialsJson: process.env.GOOGLE_CREDENTIALS_JSON || '',

  /** Sheet names mapping */
  sheets: {
    projects: '_projects',
    employees: '_employees',
    positions: '_positions',
    shifts: '_shifts',
    extras: '_extras',
    timingShifts: '_timing_shifts',
    timingScenes: '_timing_scenes',
    locations: '_locations',
    expenses: '_expenses',
    settings: '_settings',
  },

  /** Google Sheets API rate limit: 300 req/min */
  rateLimit: {
    maxRequestsPerMinute: 300,
  },

  /** Cache TTL in milliseconds (30 seconds) */
  cacheTtlMs: 30_000,

  /** Pagination defaults */
  pagination: {
    defaultLimit: 50,
    maxLimit: 500,
  },
} as const;
