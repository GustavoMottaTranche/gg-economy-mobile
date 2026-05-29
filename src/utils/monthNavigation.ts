/**
 * Month navigation utility for the Dashboard month selector.
 * Provides functions for advancing/retreating months in YYYY-MM format.
 */

/**
 * Get the next month from a YYYY-MM string.
 * Correctly handles December→January year transitions.
 *
 * @param yearMonth - Month string in YYYY-MM format
 * @returns Next month string in YYYY-MM format
 */
export function getNextMonth(yearMonth: string): string {
  const parts = yearMonth.split('-');
  const year = parseInt(parts[0] ?? '0', 10);
  const month = parseInt(parts[1] ?? '0', 10);

  if (month === 12) {
    return `${year + 1}-01`;
  }

  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
