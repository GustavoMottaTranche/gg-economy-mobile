import fc from 'fast-check';

/**
 * Property 2: Category Filter Correctness
 *
 * For any list of transactions and any non-empty subset of category IDs used as a filter,
 * the filtered result SHALL contain exactly those transactions whose `categoryId` is a
 * member of the selected category ID set (OR logic).
 *
 * **Validates: Requirements 4.3, 4.5**
 */

// --- Types ---

interface Transaction {
  id: string;
  categoryId: string | null;
  amount: number;
  date: string;
  referenceMonth: string;
  title: string;
}

// --- Filter Logic Under Test ---

/**
 * Applies category filter with OR logic.
 * When categoryIds is non-empty, only transactions whose categoryId is in the set pass.
 * When categoryIds is empty or undefined, all transactions pass (no filtering).
 */
function applyCategoryFilter(
  transactions: Transaction[],
  categoryIds: string[] | undefined
): Transaction[] {
  if (!categoryIds || categoryIds.length === 0) {
    return transactions;
  }
  return transactions.filter((t) => t.categoryId !== null && categoryIds.includes(t.categoryId));
}

// --- Arbitraries ---

const categoryIdArb = fc.uuid();

const transactionArb = (categoryPool: string[]): fc.Arbitrary<Transaction> =>
  fc.record({
    id: fc.uuid(),
    categoryId: fc.oneof(
      fc.constantFrom(...categoryPool),
      fc.constant(null)
    ),
    amount: fc.integer({ min: -9999999, max: 9999999 }).filter((a) => a !== 0),
    date: fc
      .integer({ min: 2020, max: 2030 })
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
      ),
    referenceMonth: fc
      .integer({ min: 2020, max: 2030 })
      .chain((year) =>
        fc.integer({ min: 1, max: 12 }).map((month) => `${year}-${String(month).padStart(2, '0')}`)
      ),
    title: fc.string({ minLength: 1, maxLength: 20 }),
  });

// --- Property Tests ---

describe('Property 2: Category Filter Correctness', () => {
  it('filtered result contains exactly those transactions whose categoryId is in the filter set (OR logic)', () => {
    fc.assert(
      fc.property(
        // Generate a pool of category IDs first, then use them for transactions and filter
        fc.array(categoryIdArb, { minLength: 2, maxLength: 8 }).chain((categoryPool) =>
          fc.tuple(
            fc.array(transactionArb(categoryPool), { minLength: 0, maxLength: 30 }),
            fc.subarray(categoryPool, { minLength: 1 })
          )
        ),
        ([transactions, filterCategoryIds]) => {
          const result = applyCategoryFilter(transactions, filterCategoryIds);

          // Every transaction in the result must have a categoryId in the filter set
          for (const t of result) {
            expect(t.categoryId).not.toBeNull();
            expect(filterCategoryIds).toContain(t.categoryId);
          }

          // Every transaction NOT in the result must have a categoryId NOT in the filter set (or null)
          const resultIds = new Set(result.map((t) => t.id));
          const excluded = transactions.filter((t) => !resultIds.has(t.id));
          for (const t of excluded) {
            expect(
              t.categoryId === null || !filterCategoryIds.includes(t.categoryId)
            ).toBe(true);
          }

          // The result should be exactly the set of transactions with matching categoryId
          const expected = transactions.filter(
            (t) => t.categoryId !== null && filterCategoryIds.includes(t.categoryId)
          );
          expect(result.map((t) => t.id).sort()).toEqual(expected.map((t) => t.id).sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when filter is empty, all transactions pass through unfiltered', () => {
    fc.assert(
      fc.property(
        fc.array(categoryIdArb, { minLength: 2, maxLength: 8 }).chain((categoryPool) =>
          fc.array(transactionArb(categoryPool), { minLength: 0, maxLength: 30 })
        ),
        (transactions) => {
          // Empty array filter
          const resultEmpty = applyCategoryFilter(transactions, []);
          expect(resultEmpty).toEqual(transactions);

          // Undefined filter
          const resultUndefined = applyCategoryFilter(transactions, undefined);
          expect(resultUndefined).toEqual(transactions);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filter preserves original transaction order', () => {
    fc.assert(
      fc.property(
        fc.array(categoryIdArb, { minLength: 2, maxLength: 8 }).chain((categoryPool) =>
          fc.tuple(
            fc.array(transactionArb(categoryPool), { minLength: 1, maxLength: 30 }),
            fc.subarray(categoryPool, { minLength: 1 })
          )
        ),
        ([transactions, filterCategoryIds]) => {
          const result = applyCategoryFilter(transactions, filterCategoryIds);

          // Verify that the relative order of transactions is preserved
          for (let i = 0; i < result.length - 1; i++) {
            const indexA = transactions.findIndex((t) => t.id === result[i]!.id);
            const indexB = transactions.findIndex((t) => t.id === result[i + 1]!.id);
            expect(indexA).toBeLessThan(indexB);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('transactions with null categoryId are always excluded when a non-empty filter is active', () => {
    fc.assert(
      fc.property(
        fc.array(categoryIdArb, { minLength: 2, maxLength: 8 }).chain((categoryPool) =>
          fc.tuple(
            fc.array(transactionArb(categoryPool), { minLength: 0, maxLength: 30 }),
            fc.subarray(categoryPool, { minLength: 1 })
          )
        ),
        ([transactions, filterCategoryIds]) => {
          const result = applyCategoryFilter(transactions, filterCategoryIds);

          // No transaction in the result should have a null categoryId
          for (const t of result) {
            expect(t.categoryId).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filter result count is always less than or equal to total transaction count', () => {
    fc.assert(
      fc.property(
        fc.array(categoryIdArb, { minLength: 2, maxLength: 8 }).chain((categoryPool) =>
          fc.tuple(
            fc.array(transactionArb(categoryPool), { minLength: 0, maxLength: 30 }),
            fc.subarray(categoryPool, { minLength: 1 })
          )
        ),
        ([transactions, filterCategoryIds]) => {
          const result = applyCategoryFilter(transactions, filterCategoryIds);
          expect(result.length).toBeLessThanOrEqual(transactions.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
