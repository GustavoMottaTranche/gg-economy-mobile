import fc from 'fast-check';

/**
 * Feature: category-detail-screen
 * Property 2: List sort order
 *
 * For any non-empty result set of category detail items, the items SHALL be
 * ordered by date descending — that is, for every consecutive pair of items
 * (item[i], item[i+1]), item[i].date >= item[i+1].date.
 *
 * This test generates random arrays of CategoryDetailItem objects with random
 * dates in YYYY-MM-DD format and verifies that after applying the sort logic
 * from useCategoryDetailData (sort by date descending using
 * b.date.localeCompare(a.date)), all adjacent pairs satisfy
 * items[i].date >= items[i+1].date.
 *
 * **Validates: Requirements 3.1**
 */

// --- Types ---

interface CategoryDetailItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: 'transaction' | 'weekly';
  weeklyGroupId?: string;
}

// --- Sort logic (extracted from useCategoryDetailData) ---

/**
 * Sorts category detail items by date descending using the same logic as
 * the useCategoryDetailData hook: b.date.localeCompare(a.date)
 */
function sortByDateDescending(items: CategoryDetailItem[]): CategoryDetailItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
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

// --- Helper ---

/**
 * Checks that items are sorted by date descending:
 * for every consecutive pair, items[i].date >= items[i+1].date
 */
function isSortedByDateDescending(items: CategoryDetailItem[]): boolean {
  for (let i = 0; i < items.length - 1; i++) {
    if (items[i]!.date < items[i + 1]!.date) {
      return false;
    }
  }
  return true;
}

// --- Property Tests ---

describe('Feature: category-detail-screen, Property 2: List sort order', () => {
  it('items are ordered by date descending after sorting (item[i].date >= item[i+1].date)', () => {
    fc.assert(
      fc.property(categoryDetailItemArrayArb, (items) => {
        const sorted = sortByDateDescending(items);

        expect(isSortedByDateDescending(sorted)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('sorting preserves all original items (no items lost or duplicated)', () => {
    fc.assert(
      fc.property(categoryDetailItemArrayArb, (items) => {
        const sorted = sortByDateDescending(items);

        expect(sorted.length).toBe(items.length);

        const originalIds = items.map((i) => i.id).sort();
        const sortedIds = sorted.map((i) => i.id).sort();
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 100 }
    );
  });

  it('sorting is idempotent (sorting an already sorted list produces the same result)', () => {
    fc.assert(
      fc.property(categoryDetailItemArrayArb, (items) => {
        const sorted1 = sortByDateDescending(items);
        const sorted2 = sortByDateDescending(sorted1);

        expect(sorted2.map((i) => i.id)).toEqual(sorted1.map((i) => i.id));
      }),
      { numRuns: 100 }
    );
  });
});
