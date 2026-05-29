/**
 * Date Utility Functions for Weekly Recurring Expenses
 *
 * Provides date calculation and comparison utilities for the
 * weekly recurring expense feature, including occurrence date
 * generation, reference month derivation, and temporal boundary checks.
 */

/**
 * Calculate all dates for a given day of week within a month,
 * starting from startDate if it falls within the month.
 *
 * @param targetMonth - YYYY-MM format
 * @param dayOfWeek - 0 (Sunday) to 6 (Saturday)
 * @param startDate - YYYY-MM-DD, earliest allowed date
 * @returns Array of YYYY-MM-DD strings (4 or 5 dates)
 */
export function getWeeklyDatesForMonth(
  targetMonth: string,
  dayOfWeek: number,
  startDate: string
): string[] {
  const [yearStr, monthStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-based

  // Get the number of days in the target month
  const daysInMonth = new Date(year, month, 0).getDate();

  const dates: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === dayOfWeek) {
      const dateStr = formatDate(year, month, day);
      // Only include dates on or after startDate
      if (dateStr >= startDate) {
        dates.push(dateStr);
      }
    }
  }

  return dates;
}

/**
 * Derive reference month (YYYY-MM) from a date (YYYY-MM-DD).
 */
export function deriveReferenceMonth(date: string): string {
  return date.substring(0, 7);
}

/**
 * Get today's date as YYYY-MM-DD at 00:00:00 for boundary comparison.
 */
export function getTodayBoundary(): string {
  const now = new Date();
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Check if a date is in the past (strictly before today).
 * Occurrences on today's date are considered "future".
 */
export function isPastDate(date: string): boolean {
  return date < getTodayBoundary();
}

/**
 * Format year, month, day into YYYY-MM-DD string.
 */
function formatDate(year: number, month: number, day: number): string {
  const y = year.toString().padStart(4, '0');
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}
