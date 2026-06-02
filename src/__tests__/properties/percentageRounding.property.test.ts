import fc from 'fast-check';
import { roundPercentages } from '../../utils/roundPercentages';

/**
 * Property 4: Percentage rounding invariant — sum equals 100
 *
 * For any set of two or more positive monetary values whose sum is greater than zero,
 * the `roundPercentages` function SHALL produce integer percentages that sum to exactly 100.
 *
 * **Validates: Requirements 3.3**
 */
describe('Property 4: Percentage rounding invariant — sum equals 100', () => {
  it('sum of rounded percentages equals exactly 100 for any positive values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 99999999 }), { minLength: 2, maxLength: 20 }),
        (values) => {
          const total = values.reduce((sum, v) => sum + v, 0);
          const result = roundPercentages(values, total);
          const sum = result.reduce((acc, v) => acc + v, 0);
          expect(sum).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all returned percentages are non-negative integers', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 99999999 }), { minLength: 2, maxLength: 20 }),
        (values) => {
          const total = values.reduce((sum, v) => sum + v, 0);
          const result = roundPercentages(values, total);
          for (const pct of result) {
            expect(Number.isInteger(pct)).toBe(true);
            expect(pct).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('output array has the same length as input array', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 99999999 }), { minLength: 2, maxLength: 20 }),
        (values) => {
          const total = values.reduce((sum, v) => sum + v, 0);
          const result = roundPercentages(values, total);
          expect(result.length).toBe(values.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
