import fc from 'fast-check';

/**
 * Property 5: Date Range Filter Correctness
 *
 * For any list of transactions and any valid date range [startDate, endDate]
 * where startDate ≤ endDate, the filtered result SHALL contain exactly those
 * transactions where `date >= startDate AND date <= endDate`.
 *
 * **Validates: Requirements 8.2, 8.3, 8.4**
 */

// --- Types ---

interface MockTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  categoryId: string | null;
  referenceMonth: string;
}

// --- Arbitraries ---

/** Generates a valid date string in YYYY-MM-DD format */
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

/** Generates a valid date range [startDate, endDate] where startDate <= endDate */
const dateRangeArb = fc
  .tuple(dateArb, dateArb)
  .map(([d1, d2]) => (d1 <= d2 ? { startDate: d1, endDate: d2 } : { startDate: d2, endDate: d1 }));

const referenceMonthArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).map((month) => `${year}-${String(month).padStart(2, '0')}`)
  );

/** Generates a mock transaction with a random date */
const mockTransactionArb = fc.record({
  id: fc.uuid(),
  date: dateArb,
  amount: fc.integer({ min: -9999999, max: 9999999 }).filter((a) => a !== 0),
  categoryId: fc.oneof(fc.uuid(), fc.constant(null)),
  referenceMonth: referenceMonthArb,
});

// --- Filter functions ---

/**
 * Filters transactions by date range (inclusive on both ends).
 * This is the in-memory equivalent of the SQL condition:
 *   date >= startDate AND date <= endDate
 */
function filterByDateRange(
  transactions: MockTransaction[],
  startDate: string | null,
  endDate: string | null
): MockTransaction[] {
  return transactions.filter((t) => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });
}

// --- Property Tests ---

describe('Property 5: Date Range Filter Correctness', () => {
  it('filtered result contains exactly those transactions where date is within [startDate, endDate] (inclusive)', () => {
    fc.assert(
      fc.property(
        fc.array(mockTransactionArb, { minLength: 0, maxLength: 30 }),
        dateRangeArb,
        (transactions, { startDate, endDate }) => {
          const filtered = filterByDateRange(transactions, startDate, endDate);

          // Every transaction in the result must have date within range
          for (const t of filtered) {
            expect(t.date >= startDate).toBe(true);
            expect(t.date <= endDate).toBe(true);
          }

          // Every transaction NOT in the result must have date outside range
          const filteredIds = new Set(filtered.map((t) => t.id));
          const excluded = transactions.filter((t) => !filteredIds.has(t.id));
          for (const t of excluded) {
            const isOutside = t.date < startDate || t.date > endDate;
            expect(isOutside).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('transactions on exact start date boundary are included', () => {
    fc.assert(
      fc.property(dateRangeArb, fc.uuid(), ({ startDate, endDate }, id) => {
        // Create a transaction with date exactly equal to startDate
        const transaction: MockTransaction = {
          id,
          date: startDate,
          amount: 1000,
          categoryId: null,
          referenceMonth: '2024-01',
        };

        const filtered = filterByDateRange([transaction], startDate, endDate);

        expect(filtered).toHaveLength(1);
        expect(filtered[0]!.id).toBe(id);
      }),
      { numRuns: 100 }
    );
  });

  it('transactions on exact end date boundary are included', () => {
    fc.assert(
      fc.property(dateRangeArb, fc.uuid(), ({ startDate, endDate }, id) => {
        // Create a transaction with date exactly equal to endDate
        const transaction: MockTransaction = {
          id,
          date: endDate,
          amount: -500,
          categoryId: null,
          referenceMonth: '2024-01',
        };

        const filtered = filterByDateRange([transaction], startDate, endDate);

        expect(filtered).toHaveLength(1);
        expect(filtered[0]!.id).toBe(id);
      }),
      { numRuns: 100 }
    );
  });

  it('when startDate equals endDate, only transactions on that exact date are included', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.array(mockTransactionArb, { minLength: 1, maxLength: 20 }),
        (singleDate, transactions) => {
          const filtered = filterByDateRange(transactions, singleDate, singleDate);

          // All filtered transactions must have exactly that date
          for (const t of filtered) {
            expect(t.date).toBe(singleDate);
          }

          // All transactions with that date must be in the result
          const expectedCount = transactions.filter((t) => t.date === singleDate).length;
          expect(filtered).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('with only startDate set (endDate null), includes all transactions on or after startDate', () => {
    fc.assert(
      fc.property(
        fc.array(mockTransactionArb, { minLength: 0, maxLength: 30 }),
        dateArb,
        (transactions, startDate) => {
          const filtered = filterByDateRange(transactions, startDate, null);

          // Every filtered transaction must have date >= startDate
          for (const t of filtered) {
            expect(t.date >= startDate).toBe(true);
          }

          // Every excluded transaction must have date < startDate
          const filteredIds = new Set(filtered.map((t) => t.id));
          const excluded = transactions.filter((t) => !filteredIds.has(t.id));
          for (const t of excluded) {
            expect(t.date < startDate).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('with only endDate set (startDate null), includes all transactions on or before endDate', () => {
    fc.assert(
      fc.property(
        fc.array(mockTransactionArb, { minLength: 0, maxLength: 30 }),
        dateArb,
        (transactions, endDate) => {
          const filtered = filterByDateRange(transactions, null, endDate);

          // Every filtered transaction must have date <= endDate
          for (const t of filtered) {
            expect(t.date <= endDate).toBe(true);
          }

          // Every excluded transaction must have date > endDate
          const filteredIds = new Set(filtered.map((t) => t.id));
          const excluded = transactions.filter((t) => !filteredIds.has(t.id));
          for (const t of excluded) {
            expect(t.date > endDate).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filter result is a subset of the original transactions (no new items introduced)', () => {
    fc.assert(
      fc.property(
        fc.array(mockTransactionArb, { minLength: 0, maxLength: 30 }),
        dateRangeArb,
        (transactions, { startDate, endDate }) => {
          const filtered = filterByDateRange(transactions, startDate, endDate);

          // Result length must be <= original length
          expect(filtered.length).toBeLessThanOrEqual(transactions.length);

          // Every item in result must exist in original
          const originalIds = new Set(transactions.map((t) => t.id));
          for (const t of filtered) {
            expect(originalIds.has(t.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty transaction list always produces empty result regardless of date range', () => {
    fc.assert(
      fc.property(dateRangeArb, ({ startDate, endDate }) => {
        const filtered = filterByDateRange([], startDate, endDate);
        expect(filtered).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
});
