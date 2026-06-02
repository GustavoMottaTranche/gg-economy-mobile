/**
 * Property 5: Reference Month Derivation
 *
 * For any valid Date, `deriveReferenceMonth(date)` SHALL return a string in
 * YYYY-MM format where the year and month match the year and month of the
 * input date.
 *
 * **Validates: Requirements 3.5, 4.5**
 */

import fc from 'fast-check';
import { deriveReferenceMonth } from '../../utils/deriveReferenceMonth';

describe('Feature: entry-title-and-dates, Property 5: Reference Month Derivation', () => {
  /**
   * **Validates: Requirements 3.5, 4.5**
   */

  it('should return a string matching YYYY-MM format for any valid date', () => {
    fc.assert(
      fc.property(
        fc
          .date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) })
          .filter((d) => !isNaN(d.getTime())),
        (date) => {
          const result = deriveReferenceMonth(date);
          expect(result).toMatch(/^\d{4}-\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return a year portion equal to the input date getFullYear()', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }), (date) => {
        const result = deriveReferenceMonth(date);
        const yearPortion = parseInt(result.split('-')[0] ?? '0', 10);
        expect(yearPortion).toBe(date.getFullYear());
      }),
      { numRuns: 100 }
    );
  });

  it('should return a month portion equal to zero-padded (date.getMonth() + 1)', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }), (date) => {
        const result = deriveReferenceMonth(date);
        const monthPortion = result.split('-')[1];
        const expected = (date.getMonth() + 1).toString().padStart(2, '0');
        expect(monthPortion).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('should satisfy the full property: result equals YYYY-MM of the input date', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }), (date) => {
        const result = deriveReferenceMonth(date);
        const expectedYear = date.getFullYear().toString();
        const expectedMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        const expected = `${expectedYear}-${expectedMonth}`;
        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});
