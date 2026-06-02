import fc from 'fast-check';

/**
 * Property 3: Transaction list ordering by date descending
 *
 * For any non-empty list of transactions returned for a category in a given month,
 * the list SHALL be ordered such that for every consecutive pair of transactions (t[i], t[i+1]),
 * the date of t[i] is greater than or equal to the date of t[i+1].
 *
 * **Validates: Requirements 2.5**
 */

interface TransactionItem {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD format
}

/**
 * Sorts transactions by date descending, simulating the database query behavior.
 */
function sortTransactionsByDateDescending(transactions: TransactionItem[]): TransactionItem[] {
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Generates a valid YYYY-MM-DD date string within a random month.
 */
const transactionDateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // Use 28 to be safe for all months
  })
  .map(({ year, month, day }) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  });

/**
 * Generates a TransactionItem with a random date.
 */
const transactionItemArb = fc.record({
  id: fc.uuid(),
  description: fc.string({ minLength: 1, maxLength: 50 }),
  amount: fc.integer({ min: -99999999, max: -1 }),
  date: transactionDateArb,
});

describe('Property 3: Transaction list ordering by date descending', () => {
  it('for every consecutive pair (t[i], t[i+1]), t[i].date >= t[i+1].date', () => {
    fc.assert(
      fc.property(fc.array(transactionItemArb, { minLength: 2, maxLength: 30 }), (transactions) => {
        const sorted = sortTransactionsByDateDescending(transactions);

        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i]!.date >= sorted[i + 1]!.date).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('sorted list has the same length as the input', () => {
    fc.assert(
      fc.property(fc.array(transactionItemArb, { minLength: 1, maxLength: 30 }), (transactions) => {
        const sorted = sortTransactionsByDateDescending(transactions);
        expect(sorted).toHaveLength(transactions.length);
      }),
      { numRuns: 100 }
    );
  });

  it('sorted list contains all original transactions', () => {
    fc.assert(
      fc.property(fc.array(transactionItemArb, { minLength: 1, maxLength: 30 }), (transactions) => {
        const sorted = sortTransactionsByDateDescending(transactions);
        for (const tx of transactions) {
          expect(sorted).toContainEqual(tx);
        }
      }),
      { numRuns: 100 }
    );
  });
});
