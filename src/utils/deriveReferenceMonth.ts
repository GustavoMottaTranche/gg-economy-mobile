/**
 * Derives the reference month (YYYY-MM) from a Date object.
 *
 * @param date - A valid Date object
 * @returns The reference month string in "YYYY-MM" format with zero-padded month
 *
 * @example
 * deriveReferenceMonth(new Date(2025, 0, 15)) // "2025-01"
 * deriveReferenceMonth(new Date(2025, 11, 1)) // "2025-12"
 */
export function deriveReferenceMonth(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  return `${year}-${month}`;
}
