// Feature: category-detail-enhancements, Property 1: Installment index computation

/**
 * Property 1: Installment Index Computation
 *
 * For any ordered list of reference months (sorted ascending, no duplicates) and any
 * target month that exists in that list, `computeInstallmentIndex` SHALL return a
 * `currentIndex` equal to the 1-based position of the target month in the list, and
 * a `totalParcels` equal to the length of the list.
 *
 * **Validates: Requirements 1.1, 1.3, 1.4, 4.6**
 */

import * as fc from 'fast-check';
import { computeInstallmentIndex } from '../utils/categoryDetailComputations';

// ─── Generators ──────────────────────────────────────────────────────────────

/**
 * Generates a single valid YYYY-MM string with month in 01-12 range.
 */
const yearMonthArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2040 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

/**
 * Generates a non-empty array of unique, sorted ascending YYYY-MM strings.
 * Uses a Set to deduplicate, then sorts lexicographically (which works for YYYY-MM format).
 */
const sortedUniqueMonthsArbitrary = fc
  .uniqueArray(yearMonthArbitrary, { minLength: 1, maxLength: 48 })
  .map((months) => months.slice().sort());

/**
 * Generates a sorted unique months array paired with a valid random index into it.
 */
const monthsWithTargetIndex = sortedUniqueMonthsArbitrary.chain((months) =>
  fc.record({
    months: fc.constant(months),
    targetIndex: fc.integer({ min: 0, max: months.length - 1 }),
  })
);

/**
 * Generates a YYYY-MM string that is guaranteed NOT to be in a given array.
 * Uses a month outside the typical range by picking from a far-future year.
 */
const monthNotInArray = (months: string[]) => yearMonthArbitrary.filter((m) => !months.includes(m));

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: category-detail-enhancements, Property 1: Installment index computation', () => {
  describe('When target month exists in the ordered list', () => {
    it('returns currentIndex equal to 1-based position and totalParcels equal to array length', () => {
      fc.assert(
        fc.property(monthsWithTargetIndex, ({ months, targetIndex }) => {
          const targetMonth = months[targetIndex];
          const result = computeInstallmentIndex(months, targetMonth);

          // Must not be null since target is in the array
          if (result === null) return false;

          return result.currentIndex === targetIndex + 1 && result.totalParcels === months.length;
        }),
        { numRuns: 100 }
      );
    });

    it('currentIndex is always between 1 and totalParcels (inclusive)', () => {
      fc.assert(
        fc.property(monthsWithTargetIndex, ({ months, targetIndex }) => {
          const targetMonth = months[targetIndex];
          const result = computeInstallmentIndex(months, targetMonth);

          if (result === null) return false;

          return result.currentIndex >= 1 && result.currentIndex <= result.totalParcels;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('When target month does NOT exist in the ordered list', () => {
    it('returns null for a target month not present in the array', () => {
      fc.assert(
        fc.property(
          sortedUniqueMonthsArbitrary.chain((months) =>
            fc.record({
              months: fc.constant(months),
              missingMonth: monthNotInArray(months),
            })
          ),
          ({ months, missingMonth }) => {
            const result = computeInstallmentIndex(months, missingMonth);
            return result === null;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
