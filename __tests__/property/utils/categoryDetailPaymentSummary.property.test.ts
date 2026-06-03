/**
 * Property-Based Test: Payment Summary Partition (Property 2)
 *
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.7**
 *
 * *For any* list of items with `amount` (number) and `isPaid` (boolean) fields,
 * `computePaymentSummary` SHALL return `paidTotal` equal to the sum of `abs(amount)`
 * for all items where `isPaid === true`, `pendingTotal` equal to the sum of `abs(amount)`
 * for all items where `isPaid === false`, and `grandTotal` equal to `paidTotal + pendingTotal`.
 */
import * as fc from 'fast-check';
import { computePaymentSummary } from '../../../src/utils/categoryDetailComputations';

describe('Feature: category-detail-enhancements, Property 2: Payment summary partition', () => {
  /**
   * Arbitrary for generating items with amount and isPaid fields.
   * Uses fc.integer() to avoid NaN/Infinity issues with floating point.
   */
  const itemArb = fc.record({
    amount: fc.integer({ min: -1000000, max: 1000000 }),
    isPaid: fc.boolean(),
  });

  /**
   * Arbitrary for generating arrays of items (0 to 50 items).
   */
  const itemsArb = fc.array(itemArb, { minLength: 0, maxLength: 50 });

  it('paidTotal should equal the sum of abs(amount) for all paid items', () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const result = computePaymentSummary(items);

        const expectedPaidTotal = items
          .filter((item) => item.isPaid === true)
          .reduce((sum, item) => sum + Math.abs(item.amount), 0);

        expect(result.paidTotal).toBe(expectedPaidTotal);
      }),
      { numRuns: 100 }
    );
  });

  it('pendingTotal should equal the sum of abs(amount) for all unpaid items', () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const result = computePaymentSummary(items);

        const expectedPendingTotal = items
          .filter((item) => item.isPaid === false)
          .reduce((sum, item) => sum + Math.abs(item.amount), 0);

        expect(result.pendingTotal).toBe(expectedPendingTotal);
      }),
      { numRuns: 100 }
    );
  });

  it('grandTotal should equal paidTotal + pendingTotal', () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const result = computePaymentSummary(items);

        expect(result.grandTotal).toBe(result.paidTotal + result.pendingTotal);
      }),
      { numRuns: 100 }
    );
  });

  it('all three properties hold simultaneously for any input', () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const result = computePaymentSummary(items);

        const paidItems = items.filter((item) => item.isPaid === true);
        const pendingItems = items.filter((item) => item.isPaid === false);

        const expectedPaidTotal = paidItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
        const expectedPendingTotal = pendingItems.reduce(
          (sum, item) => sum + Math.abs(item.amount),
          0
        );

        // Property 1: paidTotal matches sum of abs(amount) for paid items
        expect(result.paidTotal).toBe(expectedPaidTotal);
        // Property 2: pendingTotal matches sum of abs(amount) for pending items
        expect(result.pendingTotal).toBe(expectedPendingTotal);
        // Property 3: grandTotal is the sum of both
        expect(result.grandTotal).toBe(expectedPaidTotal + expectedPendingTotal);
      }),
      { numRuns: 100 }
    );
  });
});
