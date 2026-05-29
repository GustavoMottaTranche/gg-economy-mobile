import fc from 'fast-check';

/**
 * Property 7: Cursor Pagination Ordering Consistency
 *
 * For any sequence of paginated results across multiple pages, the concatenation
 * of all pages SHALL be strictly ordered by (date DESC, id DESC) with no duplicate
 * transactions and no gaps (every transaction matching the filters appears exactly
 * once across all pages).
 *
 * **Validates: Requirements 6.5, 6.4**
 *
 * This test simulates cursor-based pagination in-memory using the same logic
 * as the usePaginatedTransactions hook:
 * - Sort by (date DESC, id DESC)
 * - Use composite cursor (lastDate, lastId) for keyset pagination
 * - Page size of 20
 * - Verify ordering, no duplicates, and completeness across all pages
 */

// --- Types ---

interface MockTransaction {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  amount: number;
  categoryId: string | null;
  referenceMonth: string;
}

// --- Cursor Pagination Simulation ---

/**
 * Simulates cursor-based pagination as implemented in usePaginatedTransactions.
 * Uses (date DESC, id DESC) ordering with composite cursor.
 */
function paginateWithCursor(
  allTransactions: MockTransaction[],
  pageSize: number
): MockTransaction[][] {
  // Sort all transactions by (date DESC, id DESC) - same as the SQL ORDER BY
  const sorted = [...allTransactions].sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    // Same date: sort by id DESC
    if (a.id > b.id) return -1;
    if (a.id < b.id) return 1;
    return 0;
  });

  const pages: MockTransaction[][] = [];
  let cursor: { lastDate: string; lastId: string } | null = null;

  while (true) {
    let page: MockTransaction[];

    if (cursor === null) {
      // First page: no cursor, just take the first pageSize items
      page = sorted.slice(0, pageSize);
    } else {
      // Subsequent pages: apply cursor condition
      // WHERE (date < lastDate OR (date = lastDate AND id < lastId))
      page = sorted
        .filter((t) => {
          if (t.date < cursor!.lastDate) return true;
          if (t.date === cursor!.lastDate && t.id < cursor!.lastId) return true;
          return false;
        })
        .slice(0, pageSize);
    }

    if (page.length === 0) break;

    pages.push(page);

    // Update cursor to last item of this page
    const lastItem = page[page.length - 1]!;
    cursor = { lastDate: lastItem.date, lastId: lastItem.id };

    // Stop if we got fewer items than pageSize (no more data)
    if (page.length < pageSize) break;
  }

  return pages;
}

// --- Arbitraries ---

const dateArb = fc
  .integer({ min: 2020, max: 2025 })
  .chain((year) =>
    fc
      .integer({ min: 1, max: 12 })
      .chain((month) =>
        fc
          .integer({ min: 1, max: 28 })
          .map(
            (day) =>
              `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          )
      )
  );

/**
 * Generate a unique ID using a counter prefix + random suffix to ensure uniqueness.
 * UUIDs from fc.uuid() are already unique with extremely high probability.
 */
const transactionArb = fc.record({
  id: fc.uuid(),
  date: dateArb,
  amount: fc.integer({ min: -9999999, max: 9999999 }).filter((a) => a !== 0),
  categoryId: fc.oneof(fc.uuid(), fc.constant(null)),
  referenceMonth: fc.constant('2024-06'), // Fixed for simplicity
});

/**
 * Generate arrays of transactions with guaranteed unique IDs.
 * Uses uniqueArray with key selector on id field.
 */
const transactionArrayArb = fc.uniqueArray(transactionArb, {
  minLength: 0,
  maxLength: 80,
  selector: (t) => t.id,
});

// --- Helper Functions ---

/**
 * Checks if a list is strictly ordered by (date DESC, id DESC).
 * Strict means no two adjacent items have the same (date, id) pair,
 * and each item is "greater than or equal to" the next in the ordering.
 */
function isStrictlyOrdered(transactions: MockTransaction[]): boolean {
  for (let i = 0; i < transactions.length - 1; i++) {
    const current = transactions[i]!;
    const next = transactions[i + 1]!;

    // date DESC: current.date should be >= next.date
    if (current.date < next.date) return false;

    // If same date, id DESC: current.id should be > next.id (strict)
    if (current.date === next.date) {
      if (current.id <= next.id) return false;
    }
  }
  return true;
}

/**
 * Checks that no duplicate IDs exist in a list of transactions.
 */
function hasNoDuplicates(transactions: MockTransaction[]): boolean {
  const ids = new Set(transactions.map((t) => t.id));
  return ids.size === transactions.length;
}

// --- Property Tests ---

describe('Property 7: Cursor Pagination Ordering Consistency', () => {
  const PAGE_SIZE = 20;

  it('concatenated pages maintain strict (date DESC, id DESC) ordering', () => {
    fc.assert(
      fc.property(transactionArrayArb, (transactions) => {
        const pages = paginateWithCursor(transactions, PAGE_SIZE);
        const concatenated = pages.flat();

        // The concatenated result should be strictly ordered
        expect(isStrictlyOrdered(concatenated)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('concatenated pages contain no duplicate transactions', () => {
    fc.assert(
      fc.property(transactionArrayArb, (transactions) => {
        const pages = paginateWithCursor(transactions, PAGE_SIZE);
        const concatenated = pages.flat();

        // No duplicates across all pages
        expect(hasNoDuplicates(concatenated)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('all transactions appear exactly once across all pages (no gaps)', () => {
    fc.assert(
      fc.property(transactionArrayArb, (transactions) => {
        const pages = paginateWithCursor(transactions, PAGE_SIZE);
        const concatenated = pages.flat();

        // Every transaction from the input should appear in the output
        const inputIds = new Set(transactions.map((t) => t.id));
        const outputIds = new Set(concatenated.map((t) => t.id));

        expect(outputIds.size).toBe(inputIds.size);
        for (const id of inputIds) {
          expect(outputIds.has(id)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('each page has at most pageSize items', () => {
    fc.assert(
      fc.property(transactionArrayArb, (transactions) => {
        const pages = paginateWithCursor(transactions, PAGE_SIZE);

        for (const page of pages) {
          expect(page.length).toBeLessThanOrEqual(PAGE_SIZE);
          expect(page.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('pagination terminates and produces correct total count', () => {
    fc.assert(
      fc.property(transactionArrayArb, (transactions) => {
        const pages = paginateWithCursor(transactions, PAGE_SIZE);
        const totalItems = pages.reduce((sum, page) => sum + page.length, 0);

        // Total items across all pages equals input count
        expect(totalItems).toBe(transactions.length);
      }),
      { numRuns: 100 }
    );
  });

  it('cursor boundary items are not repeated across page boundaries', () => {
    fc.assert(
      fc.property(transactionArrayArb, (transactions) => {
        const pages = paginateWithCursor(transactions, PAGE_SIZE);

        if (pages.length < 2) return; // Need at least 2 pages to check boundaries

        for (let i = 0; i < pages.length - 1; i++) {
          const currentPage = pages[i]!;
          const nextPage = pages[i + 1]!;

          const lastOfCurrent = currentPage[currentPage.length - 1]!;
          const firstOfNext = nextPage[0]!;

          // The first item of the next page should come strictly after
          // the last item of the current page in (date DESC, id DESC) order
          const isStrictlyAfter =
            firstOfNext.date < lastOfCurrent.date ||
            (firstOfNext.date === lastOfCurrent.date && firstOfNext.id < lastOfCurrent.id);

          expect(isStrictlyAfter).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('ordering is consistent regardless of input order', () => {
    fc.assert(
      fc.property(
        transactionArrayArb,
        fc.infiniteStream(fc.nat()),
        (transactions, shuffleStream) => {
          if (transactions.length === 0) return;

          // Paginate the original array
          const pages1 = paginateWithCursor(transactions, PAGE_SIZE);
          const result1 = pages1.flat();

          // Shuffle the input array using the random stream
          const shuffled = [...transactions];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = shuffleStream.next().value % (i + 1);
            const temp = shuffled[i]!;
            shuffled[i] = shuffled[j]!;
            shuffled[j] = temp;
          }

          // Paginate the shuffled array
          const pages2 = paginateWithCursor(shuffled, PAGE_SIZE);
          const result2 = pages2.flat();

          // Both should produce the same ordered result
          const ids1 = result1.map((t) => t.id);
          const ids2 = result2.map((t) => t.id);

          expect(ids1).toEqual(ids2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
