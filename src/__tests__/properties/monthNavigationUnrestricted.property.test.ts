/**
 * Property-Based Tests for Unrestricted Month Navigation
 *
 * These tests verify that the getNextMonth function correctly produces
 * the chronologically next month for any valid YYYY-MM input,
 * with proper December→January year rollover.
 *
 * **Validates: Requirements 5.2**
 */

import fc from 'fast-check';
import { getNextMonth } from '../../utils/monthNavigation';

describe('Property 6: Month advancement produces correct next month', () => {
  /**
   * Feature: home-ui-categories-chart, Property 6: Month advancement produces correct next month
   *
   * For any valid YYYY-MM string, advancing to the next month SHALL produce
   * the chronologically next month, correctly handling December→January
   * year transitions (e.g., "2024-12" → "2025-01").
   *
   * **Validates: Requirements 5.2**
   */
  it('for any valid YYYY-MM, getNextMonth produces the chronologically next month with correct year transitions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        (year, month) => {
          const input = `${year}-${String(month).padStart(2, '0')}`;
          const result = getNextMonth(input);

          // Result must be a valid YYYY-MM string
          expect(result).toMatch(/^\d{4}-\d{2}$/);

          const [resultYearStr, resultMonthStr] = result.split('-');
          const resultYear = parseInt(resultYearStr ?? '0', 10);
          const resultMonth = parseInt(resultMonthStr ?? '0', 10);

          // Result month must be valid (1-12)
          expect(resultMonth).toBeGreaterThanOrEqual(1);
          expect(resultMonth).toBeLessThanOrEqual(12);

          if (month === 12) {
            // December→January: next month is 01 of next year
            expect(resultMonth).toBe(1);
            expect(resultYear).toBe(year + 1);
          } else {
            // For months 01-11: next month is current month + 1, same year
            expect(resultMonth).toBe(month + 1);
            expect(resultYear).toBe(year);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
