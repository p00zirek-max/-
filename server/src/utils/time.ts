/**
 * Time utilities for shift duration calculations.
 * Handles midnight crossing and multi-day shifts (D-002).
 */

/** Parse "HH:mm" string to fractional hours */
export function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) {
    throw new Error(`Invalid time format: "${timeStr}". Expected HH:mm`);
  }
  return h + m / 60;
}

/**
 * Calculate difference between two times in hours.
 * Handles midnight crossing: if end < start, adds 24 hours.
 *
 * @param startStr - shift start time "HH:mm"
 * @param endStr   - shift end time "HH:mm"
 * @returns difference in hours (always positive)
 */
export function timeDiff(startStr: string, endStr: string): number {
  const start = parseTime(startStr);
  const end = parseTime(endStr);

  let diff = end - start;
  if (diff < 0) {
    diff += 24; // midnight crossing
  }
  return diff;
}

/**
 * Calculate raw hours of a shift (D-002).
 *
 * raw_hours = timeDiff(start, end) + (days_in_shift * 24)
 *
 * Example: start=18:00, end=0:30, days=1
 *   timeDiff = 6.5, + 1*24 = 30.5? NO:
 *   Actually: 18:00 → 0:30 crosses midnight, so timeDiff = 6.5h
 *   days_in_shift=1 means the shift spans into the next day
 *   So raw = 6.5 + 0*24 = 6.5  (days_in_shift=0 for this case)
 *
 *   If truly multi-day: start=8:00, end=8:00, days=1 → 0 + 24 = 24h
 *
 * @param startStr      shift start "HH:mm"
 * @param endStr        shift end "HH:mm"
 * @param daysInShift   additional full days (0, 1, 2, 3)
 */
export function calculateRawHours(
  startStr: string,
  endStr: string,
  daysInShift: number,
): number {
  const diff = timeDiff(startStr, endStr);
  return diff + daysInShift * 24;
}

/**
 * Count how many lunch checkboxes are checked (D-027).
 * Each checked checkbox adds +1 hour to overtime.
 */
export function countLunchCheckboxes(
  lunchCurrent: boolean,
  lunchLate: boolean,
  lunchNone: boolean,
): number {
  let count = 0;
  if (lunchCurrent) count++;
  if (lunchLate) count++;
  if (lunchNone) count++;
  return count;
}

/**
 * Check if a date string falls within a given month string.
 * @param dateStr  ISO date "YYYY-MM-DD"
 * @param monthStr month string "YYYY-MM"
 */
export function dateInMonth(dateStr: string, monthStr: string): boolean {
  return dateStr.startsWith(monthStr);
}

/**
 * Check if a date string falls within a range.
 * @param dateStr  ISO date "YYYY-MM-DD"
 * @param from     start of range (inclusive)
 * @param to       end of range (inclusive)
 */
export function dateInRange(
  dateStr: string,
  from?: string,
  to?: string,
): boolean {
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

/**
 * Get the ISO week bounds (Monday to Sunday) for a given date.
 */
export function getWeekBounds(dateStr: string): { from: string; to: string } {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}
