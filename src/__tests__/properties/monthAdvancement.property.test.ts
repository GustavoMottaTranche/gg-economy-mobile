/**
 * Property-Based Tests for Month Advancement Correctness
 *
 * These tests verify that the advanceMonth function correctly produces
 * sequential calendar months with proper December→January year rollover.
 *
 * **Validates: Requirements 2.2, 3.2, 7.1**
 */

import fc from 'fast-check';
import { advanceMonth } from '../../services/installment/InstallmentCalculator';

describe('Property 2: Month advancement correctness', () => {
  /**
   * Feature: manual-entry-installments, Property 2: Month advancement correctness
   *
   * For any valid start month (YYYY-MM format) and valid parcel count (2 to 48),
   * the advanceMonth function SHALL produce a sequence of months where each
   * consecutive month is exactly one calendar month after the previous, correctly
   * rolling over from December to January of the next year.
   *
   * **Validates: Requirements 2.2, 3.2, 7.1**
   */
  it('each consecutive month is exactly one calendar month after the previous with correct December→January rollover', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 2, max: 48 }),
        (year, month, parcelCount) => {
          const startMonth = `${year}-${String(month).padStart(2, '0')}`;

          // Generate the sequence of months
          const months: string[] = [];
          for (let i = 0; i < parcelCount; i++) {
            months.push(advanceMonth(startMonth, i));
          }

          // Verify each consecutive pair
          for (let i = 0; i < months.length - 1; i++) {
            const [currentYearStr, currentMonthStr] = months[i]!.split('-');
            const [nextYearStr, nextMonthStr] = months[i + 1]!.split('-');

            const currentYear = parseInt(currentYearStr ?? '0', 10);
            const currentMonth = parseInt(currentMonthStr ?? '0', 10);
            const nextYear = parseInt(nextYearStr ?? '0', 10);
            const nextMonth = parseInt(nextMonthStr ?? '0', 10);

            if (currentMonth === 12) {
              // December→January rollover: next month should be 01 of next year
              expect(nextMonth).toBe(1);
              expect(nextYear).toBe(currentYear + 1);
            } else {
              // Otherwise: next month is current month + 1 of same year
              expect(nextMonth).toBe(currentMonth + 1);
              expect(nextYear).toBe(currentYear);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
