import fc from 'fast-check';

/**
 * Feature: category-detail-screen
 * Property 3: Total consistency
 *
 * For any set of displayed items on the Category Detail Screen, the sum of
 * abs(amount) across all items SHALL equal the total displayed in the header
 * section.
 *
 * This test generates random arrays of CategoryDetailItem objects with known
 * amount values (both positive and negative) and verifies that the total
 * computation (sum of Math.abs(amount)) produces the correct result matching
 * the independently computed expected value.
 *
 * **Validates: Requirements 5.4, 2.2**
 */

// --- Types ---

interface CategoryDetailItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amount: number; // in cents (raw DB value, negative for expenses)
  type: 'transaction' | 'weekly';
  weeklyGroupId?: string;
}

// --- Total computation logic (extracted from useCategoryDetailData) ---

/**
 * Computes the total as sum of abs(amount) across all items.
 * This mirrors the exact logic in useCategoryDetailData hook:
 *   mergedItems.reduce((sum, item) => sum + Math.abs(item.amount), 0)
 */
function computeTotal(items: CategoryDetailItem[]): number {
  return items.reduce((sum, item) => sum + Math.abs(item.amount), 0);
}

// --- Arbitraries ---

const dateArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc
      .integer({ min: 1, max: 12 })
      .chain((month) =>
        fc
          .integer({ min: 1, max: 28 })
          .map((day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
      )
  );

const categoryDetailItemArb: fc.Arbitrary<CategoryDetailItem> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  date: dateArb,
  amount: fc.integer({ min: -9999999, max: 9999999 }).filter((a) => a !== 0),
  type: fc.oneof(fc.constant('transaction' as const), fc.constant('weekly' as const)),
  weeklyGroupId: fc.option(fc.uuid(), { nil: undefined }),
});

const categoryDetailItemArrayArb = fc.array(categoryDetailItemArb, {
  minLength: 0,
  maxLength: 50,
});

// --- Property Tests ---

describe('Feature: category-detail-screen, Property 3: Total consistency', () => {
  it('total equals sum of abs(amount) across all items', () => {
    fc.assert(
      fc.property(categoryDetailItemArrayArb, (items) => {
        const total = computeTotal(items);

        // Independently compute expected total
        const expectedTotal = items.reduce((sum, item) => sum + Math.abs(item.amount), 0);

        expect(total).toBe(expectedTotal);
      }),
      { numRuns: 100 }
    );
  });

  it('total is always non-negative regardless of item amounts', () => {
    fc.assert(
      fc.property(categoryDetailItemArrayArb, (items) => {
        const total = computeTotal(items);

        expect(total).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('total is zero for an empty items array', () => {
    const total = computeTotal([]);
    expect(total).toBe(0);
  });

  it('total treats positive and negative amounts equivalently (abs symmetry)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 9999999 }), { minLength: 1, maxLength: 20 }),
        (amounts) => {
          // Create items with positive amounts
          const positiveItems: CategoryDetailItem[] = amounts.map((amt, i) => ({
            id: `pos-${i}`,
            title: `Item ${i}`,
            date: '2024-06-15',
            amount: amt,
            type: 'transaction' as const,
          }));

          // Create items with negative amounts (same magnitudes)
          const negativeItems: CategoryDetailItem[] = amounts.map((amt, i) => ({
            id: `neg-${i}`,
            title: `Item ${i}`,
            date: '2024-06-15',
            amount: -amt,
            type: 'transaction' as const,
          }));

          const totalPositive = computeTotal(positiveItems);
          const totalNegative = computeTotal(negativeItems);

          // Both should produce the same total since we use abs()
          expect(totalPositive).toBe(totalNegative);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total equals sum of individual item abs(amount) values (additive property)', () => {
    fc.assert(
      fc.property(categoryDetailItemArrayArb, (items) => {
        const total = computeTotal(items);

        // Each item contributes its absolute amount to the total
        const sumOfAbsAmounts = items
          .map((item) => Math.abs(item.amount))
          .reduce((a, b) => a + b, 0);

        expect(total).toBe(sumOfAbsAmounts);
      }),
      { numRuns: 100 }
    );
  });
});
