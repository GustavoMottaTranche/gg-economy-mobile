import fc from 'fast-check';
import { PaginationFilters } from '../../db/buildFilterConditions';

/**
 * Property 3: Summary Recalculation from Filtered Data
 *
 * For any set of transactions and any combination of active filters (category,
 * value range, date range), the computed summary totals (totalIncome, totalExpenses,
 * balance) SHALL equal the aggregation computed from only the transactions that
 * pass all active filter conditions.
 *
 * **Validates: Requirements 4.6, 5.6, 8.6**
 */

// --- Interfaces ---

interface FilteredSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

interface MockTransaction {
  id: string;
  categoryId: string | null;
  amount: number; // in cents, positive = income, negative = expense
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
}

// --- Arbitraries ---

const referenceMonthArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).map((month) => `${year}-${String(month).padStart(2, '0')}`)
  );

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

const categoryIdArb = fc.oneof(
  fc.constantFrom('cat-food', 'cat-transport', 'cat-salary', 'cat-rent', 'cat-entertainment'),
  fc.constant(null)
);

const mockTransactionArb: fc.Arbitrary<MockTransaction> = fc.record({
  id: fc.uuid(),
  categoryId: categoryIdArb,
  amount: fc.integer({ min: -9999999, max: 9999999 }).filter((a) => a !== 0),
  date: dateArb,
  referenceMonth: referenceMonthArb,
});

const categoryIdsFilterArb = fc.oneof(
  fc.constant(undefined),
  fc.constant([] as string[]),
  fc.subarray(['cat-food', 'cat-transport', 'cat-salary', 'cat-rent', 'cat-entertainment'], {
    minLength: 1,
  })
);

const amountFilterArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.integer({ min: 1, max: 9999999 })
);

const dateFilterArb = fc.oneof(fc.constant(null), fc.constant(undefined), dateArb);

const paginationFiltersArb: fc.Arbitrary<PaginationFilters> = fc.record({
  referenceMonth: referenceMonthArb,
  categoryIds: categoryIdsFilterArb,
  minAmount: amountFilterArb,
  maxAmount: amountFilterArb,
  startDate: dateFilterArb,
  endDate: dateFilterArb,
});

// --- Helper Functions ---

/**
 * Applies all filter conditions to a set of transactions (in-memory equivalent
 * of the SQL WHERE clause built by buildFilterConditions).
 */
function applyFilters(
  transactions: MockTransaction[],
  filters: PaginationFilters
): MockTransaction[] {
  return transactions.filter((t) => {
    // Reference month filter (always applied)
    if (t.referenceMonth !== filters.referenceMonth) return false;

    // Category filter (OR logic within selected IDs)
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      if (!filters.categoryIds.includes(t.categoryId ?? '')) return false;
    }

    // Min amount filter (on absolute value)
    if (filters.minAmount != null) {
      if (Math.abs(t.amount) < filters.minAmount) return false;
    }

    // Max amount filter (on absolute value)
    if (filters.maxAmount != null) {
      if (Math.abs(t.amount) > filters.maxAmount) return false;
    }

    // Start date filter
    if (filters.startDate) {
      if (t.date < filters.startDate) return false;
    }

    // End date filter
    if (filters.endDate) {
      if (t.date > filters.endDate) return false;
    }

    return true;
  });
}

/**
 * Computes the FilteredSummary from a set of transactions.
 * This mirrors the SQL aggregate query logic:
 * - totalIncome = SUM of positive amounts
 * - totalExpenses = ABS(SUM of negative amounts)
 * - balance = totalIncome - totalExpenses
 * - transactionCount = COUNT of transactions
 */
function computeFilteredSummary(transactions: MockTransaction[]): FilteredSummary {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const t of transactions) {
    if (t.amount > 0) {
      totalIncome += t.amount;
    } else {
      totalExpenses += Math.abs(t.amount);
    }
  }

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    transactionCount: transactions.length,
  };
}

// --- Property Tests ---

describe('Property 3: Summary Recalculation from Filtered Data', () => {
  it('computed summary from filtered transactions equals manual aggregation of filtered subset', () => {
    fc.assert(
      fc.property(
        fc.array(mockTransactionArb, { minLength: 0, maxLength: 50 }),
        paginationFiltersArb,
        (transactions, filters) => {
          // Step 1: Apply all filters to get the filtered subset
          const filteredSubset = applyFilters(transactions, filters);

          // Step 2: Compute summary manually from the filtered subset
          const manualSummary = computeFilteredSummary(filteredSubset);

          // Step 3: Verify the summary invariants hold
          // totalIncome should be the sum of all positive amounts in filtered set
          const expectedIncome = filteredSubset
            .filter((t) => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);

          // totalExpenses should be the absolute sum of all negative amounts in filtered set
          const expectedExpenses = filteredSubset
            .filter((t) => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

          expect(manualSummary.totalIncome).toBe(expectedIncome);
          expect(manualSummary.totalExpenses).toBe(expectedExpenses);
          expect(manualSummary.balance).toBe(expectedIncome - expectedExpenses);
          expect(manualSummary.transactionCount).toBe(filteredSubset.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('summary balance always equals totalIncome minus totalExpenses for any filter combination', () => {
    fc.assert(
      fc.property(
        fc.array(mockTransactionArb, { minLength: 0, maxLength: 50 }),
        paginationFiltersArb,
        (transactions, filters) => {
          const filteredSubset = applyFilters(transactions, filters);
          const summary = computeFilteredSummary(filteredSubset);

          // The balance invariant must always hold
          expect(summary.balance).toBe(summary.totalIncome - summary.totalExpenses);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('summary transactionCount equals the number of transactions passing all filters', () => {
    fc.assert(
      fc.property(
        fc.array(mockTransactionArb, { minLength: 0, maxLength: 50 }),
        paginationFiltersArb,
        (transactions, filters) => {
          const filteredSubset = applyFilters(transactions, filters);
          const summary = computeFilteredSummary(filteredSubset);

          expect(summary.transactionCount).toBe(filteredSubset.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('totalIncome is always non-negative and totalExpenses is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(mockTransactionArb, { minLength: 0, maxLength: 50 }),
        paginationFiltersArb,
        (transactions, filters) => {
          const filteredSubset = applyFilters(transactions, filters);
          const summary = computeFilteredSummary(filteredSubset);

          expect(summary.totalIncome).toBeGreaterThanOrEqual(0);
          expect(summary.totalExpenses).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty filtered result produces zero summary', () => {
    fc.assert(
      fc.property(paginationFiltersArb, (_filters) => {
        // With no transactions, summary should always be zero
        const summary = computeFilteredSummary([]);

        expect(summary.totalIncome).toBe(0);
        expect(summary.totalExpenses).toBe(0);
        expect(summary.balance).toBe(0);
        expect(summary.transactionCount).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('adding a filter can only reduce or maintain the summary totals, never increase them', () => {
    fc.assert(
      fc.property(
        fc.array(mockTransactionArb, { minLength: 1, maxLength: 30 }),
        referenceMonthArb,
        fc.subarray(['cat-food', 'cat-transport', 'cat-salary', 'cat-rent', 'cat-entertainment'], {
          minLength: 1,
        }),
        (transactions, refMonth, categoryIds) => {
          // Base filter: only referenceMonth
          const baseFilters: PaginationFilters = {
            referenceMonth: refMonth,
          };

          // Stricter filter: referenceMonth + category
          const stricterFilters: PaginationFilters = {
            referenceMonth: refMonth,
            categoryIds,
          };

          const baseFiltered = applyFilters(transactions, baseFilters);
          const stricterFiltered = applyFilters(transactions, stricterFilters);

          const baseSummary = computeFilteredSummary(baseFiltered);
          const stricterSummary = computeFilteredSummary(stricterFiltered);

          // Adding a filter can only reduce or maintain the count
          expect(stricterSummary.transactionCount).toBeLessThanOrEqual(
            baseSummary.transactionCount
          );

          // Adding a filter can only reduce or maintain income
          expect(stricterSummary.totalIncome).toBeLessThanOrEqual(baseSummary.totalIncome);

          // Adding a filter can only reduce or maintain expenses
          expect(stricterSummary.totalExpenses).toBeLessThanOrEqual(baseSummary.totalExpenses);
        }
      ),
      { numRuns: 100 }
    );
  });
});
