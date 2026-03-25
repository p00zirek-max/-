/**
 * Singleton Google Sheets API client.
 * Handles authentication and provides low-level read/write operations.
 */

import { google, type sheets_v4 } from 'googleapis';
import { config } from '../../config';
import fs from 'fs';
import path from 'path';

let sheetsInstance: sheets_v4.Sheets | null = null;

/**
 * Get or create the Google Sheets API client (singleton).
 */
export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsInstance) return sheetsInstance;

  let auth;

  if (config.credentialsJson) {
    // Vercel: credentials passed as JSON env var
    const credentials = JSON.parse(config.credentialsJson);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    // Local: credentials from file
    const credPath = path.resolve(config.credentialsPath);
    if (!fs.existsSync(credPath)) {
      throw new Error(`Credentials file not found at: ${credPath}`);
    }
    auth = new google.auth.GoogleAuth({
      keyFile: credPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  sheetsInstance = google.sheets({ version: 'v4', auth });
  return sheetsInstance;
}

/** The spreadsheet ID (our database) */
export function getSpreadsheetId(): string {
  return config.spreadsheetId;
}

// ─── LOW-LEVEL OPERATIONS ──────────────────────────────────────────────

/**
 * Read all rows from a sheet (excluding header row).
 * Returns array of string arrays.
 */
export async function readSheet(sheetName: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:ZZ`,
  });
  const rows = res.data.values || [];
  // Skip header row
  return rows.length > 1 ? rows.slice(1) : [];
}

/**
 * Read header row to get column names.
 */
export async function readHeaders(sheetName: string): Promise<string[]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!1:1`,
  });
  return res.data.values?.[0] || [];
}

/**
 * Append a row to a sheet.
 */
export async function appendRow(
  sheetName: string,
  values: (string | number | boolean | null)[],
): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:A`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [values.map(v => v === null ? '' : String(v))],
    },
  });
}

/**
 * Update a specific row by row number (1-based, row 1 = header).
 */
export async function updateRow(
  sheetName: string,
  rowNumber: number,
  values: (string | number | boolean | null)[],
): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [values.map(v => v === null ? '' : String(v))],
    },
  });
}

/**
 * Delete a row by row number (1-based).
 * Uses batchUpdate to delete the row from the sheet.
 */
export async function deleteRow(
  sheetName: string,
  rowNumber: number,
): Promise<void> {
  const sheets = await getSheetsClient();

  // First, get the sheet ID from the sheet name
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: 'sheets.properties',
  });

  const sheet = spreadsheet.data.sheets?.find(
    s => s.properties?.title === sheetName,
  );
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // 0-based
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}

/**
 * Find row number (1-based) where column at index matches a value.
 * Returns -1 if not found. Row 1 is header, data starts at row 2.
 */
export async function findRowByColumnValue(
  sheetName: string,
  columnIndex: number,
  value: string,
): Promise<number> {
  const rows = await readSheet(sheetName);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][columnIndex] === value) {
      return i + 2; // +2 because: +1 for 0-based, +1 for header row
    }
  }
  return -1;
}

// ─── SIMPLE CACHE ──────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expires: number }>();

/**
 * Read sheet with caching (30s TTL).
 */
export async function readSheetCached(sheetName: string): Promise<string[][]> {
  const key = `sheet:${sheetName}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data as string[][];
  }

  const data = await readSheet(sheetName);
  cache.set(key, { data, expires: Date.now() + config.cacheTtlMs });
  return data;
}

/**
 * Invalidate cache for a sheet (call after write operations).
 */
export function invalidateCache(sheetName: string): void {
  cache.delete(`sheet:${sheetName}`);
}

/**
 * Invalidate all cache.
 */
export function invalidateAllCache(): void {
  cache.clear();
}
