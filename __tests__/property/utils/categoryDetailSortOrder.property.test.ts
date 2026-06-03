/**
 * Property-Based Test: Sort Order Invariant (Property 3)
 *
 * **Validates: Requirements 2.7**
 *
 * *For any* list of `CategoryDetailItem` objects, after applying `sortByPaymentStatusAndDate`,
 * all items with `isPaid === true` SHALL appear before all items with `isPaid === false`,
 * AND within each group (paid or pending), items SHALL be ordered by `date` descending
 * (lexicographic comparison on YYYY-MM-DD strings).
 */
import * as fc from 'fast-check';
import {
  sortByPaymentStatusAndDate,
  CategoryDetailItem,
} from '../../../src/utils/categoryDetailComputations';

describe('Feature: category-detail-enhancements, Property 3: Sort order invariant', () => {
  /**
   * Arbitrary for generating valid YYYY-MM-DD date strings.
   * Uses integer ranges for year, month, day and formats them properly.
   */
  const dateArb = fc
    .record({
      year: fc.integer({ min: 2000, max: 2099 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 28 }), // Use 28 to always produce valid dates
    })
    .map(({ year, month, day }) => {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    });

  /**
   * Arbitrary for generating a CategoryDetailItem.
   */
  const categoryDetailItemArb: fc.Arbitrary<CategoryDetailItem> = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 20 }),
    date: dateArb,
    amount: fc.integer({ min: -1000000, max: 1000000 }),
    type: fc.constantFrom('transaction' as const, 'weekly' as const),
    isPaid: fc.boolean(),
    weeklyGroupId: fc.option(fc.uuid(), { nil: undefined }),
    installmentGroupId: fc.option(fc.uuid(), { nil: null }),
    recurringId: fc.option(fc.uuid(), { nil: null }),
  });

  /**
   * Arbitrary for generating arrays of CategoryDetailItem (0 to 50 items).
   */
  const itemsArb = fc.array(categoryDetailItemArb, { minLength: 0, maxLength: 50 });

  it('all paid items should precede all pending items in the result', () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const sorted = sortByPaymentStatusAndDate(items);

        // Find the index of the first pending item
        const firstPendingIndex = sorted.findIndex((item) => !item.isPaid);

        if (firstPendingIndex === -1) {
          // No pending items — all items are paid, which is valid
          return true;
        }

        // All items after the first pending item must also be pending
        const allAfterArePending = sorted.slice(firstPendingIndex).every((item) => !item.isPaid);
        expect(allAfterArePending).toBe(true);

        // All items before the first pending item must be paid
        const allBeforeArePaid = sorted.slice(0, firstPendingIndex).every((item) => item.isPaid);
        expect(allBeforeArePaid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('dates should be in descending order within the paid group', () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const sorted = sortByPaymentStatusAndDate(items);

        const paidItems = sorted.filter((item) => item.isPaid);

        for (let i = 1; i < paidItems.length; i++) {
          // Each date should be <= the previous date (descending order)
          expect(paidItems[i].date <= paidItems[i - 1].date).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('dates should be in descending order within the pending group', () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const sorted = sortByPaymentStatusAndDate(items);

        const pendingItems = sorted.filter((item) => !item.isPaid);

        for (let i = 1; i < pendingItems.length; i++) {
          // Each date should be <= the previous date (descending order)
          expect(pendingItems[i].date <= pendingItems[i - 1].date).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('the result should have the same length as the input (no items lost)', () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        const sorted = sortByPaymentStatusAndDate(items);
        expect(sorted.length).toBe(items.length);
      }),
      { numRuns: 100 }
    );
  });
});
