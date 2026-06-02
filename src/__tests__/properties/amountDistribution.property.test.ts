import fc from 'fast-check';
import { distributeAmount } from '../../services/installment/InstallmentCalculator';

/**
 * Property 1: Amount distribution invariant
 *
 * For any valid total amount (1 to 99999999999 cents) and valid parcel count (2 to 48),
 * the distributeAmount function SHALL produce an array where:
 * (a) the sum of all elements equals the original total exactly,
 * (b) the first element equals floor(total / count) + (total % count),
 * (c) all remaining elements equal floor(total / count).
 *
 * **Validates: Requirements 2.3, 2.4, 2.5**
 */
describe('Property 1: Amount distribution invariant', () => {
  it('sum of all parcels equals the original total exactly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99999999999 }),
        fc.integer({ min: 2, max: 48 }),
        (total, count) => {
          const result = distributeAmount(total, count);
          const sum = result.reduce((acc, val) => acc + val, 0);
          expect(sum).toBe(total);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('first parcel equals floor(total / count) + remainder', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99999999999 }),
        fc.integer({ min: 2, max: 48 }),
        (total, count) => {
          const result = distributeAmount(total, count);
          const base = Math.floor(total / count);
          const remainder = total % count;
          expect(result[0]).toBe(base + remainder);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all remaining parcels equal floor(total / count)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99999999999 }),
        fc.integer({ min: 2, max: 48 }),
        (total, count) => {
          const result = distributeAmount(total, count);
          const base = Math.floor(total / count);
          for (let i = 1; i < result.length; i++) {
            expect(result[i]).toBe(base);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
