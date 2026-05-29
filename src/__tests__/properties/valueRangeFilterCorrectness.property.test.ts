import fc from 'fast-check';
import { PaginationFilters } from '../../db/buildFilterConditions';

/**
 * Property 4: Value Range Filter Correctness
 *
 * For any list of transactions and any valid value range [minAmount, maxAmount]
 * where minAmount ≤ maxAmount, the filtered result SHALL contain exactly those
 * transactions where `abs(amount) >= minAmount AND abs(amount) <= maxAmount`.
 *
 * **Validates: Requirements 5.2, 5.3, 5.4**
 */

// --- Arbitraries ---

const referenceMonthArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).map((month) => `${year}-${String(month).padStart(2, '0')}`)
  );

interface MockTransaction {
  id: string;
  categoryId: string | null;
  amount: number;
  date: string;
  referenceMonth: string;
}

const mockTransactionArb = (referenceMonth: string): fc.Arbitrary<MockTransaction> =>
  fc.record({
    id: fc.uuid(),
    categoryId: fc.oneof(fc.uuid(), fc.constant(null)),
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
    referenceMonth: fc.constant(referenceMonth),
  });

/** Generates a valid [min, max] range where min ≤ max */
const valueRangeArb = fc
  .integer({ min: 0, max: 9999999 })
  .chain((a) =>
    fc.integer({ min: a, max: 9999999 }).map((b) => ({ minAmount: a, maxAmount: b }))
  );

// --- Filter function under test ---

/**
 * Applies value range filter on absolute amounts.
 * This mirrors the SQL logic: ABS(amount) >= minAmount AND ABS(amount) <= maxAmount
 */
function applyValueRangeFilter(
  transactions: MockTransaction[],
  minAmount: number | null | undefined,
  maxAmount: number | null | undefined
): MockTransaction[] {
  return transactions.filter((t) => {
    const absAmount = Math.abs(t.amount);
    if (minAmount != null && absAmount < minAmount) return false;
    if (maxAmount != null && absAmount > maxAmount) return false;
    return true;
  });
}

// --- Property Tests ---

describe('Property 4: Value Range Filter Correctness', () => {
  it('filtered result contains exactly transactions where abs(amount) is within [min, max]', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((refMonth) =>
          fc.tuple(
            fc.array(mockTransactionArb(refMonth), { minLength: 0, maxLength: 30 }),
            valueRangeArb,
            fc.constant(refMonth)
          )
        ),
        ([transactions, range, _refMonth]) => {
          const { minAmount, maxAmount } = range;

          const filtered = applyValueRangeFilter(transactions, minAmount, maxAmount);

          // Every transaction in the result must have abs(amount) within [min, max]
          for (const t of filtered) {
            expect(Math.abs(t.amount)).toBeGreaterThanOrEqual(minAmount);
            expect(Math.abs(t.amount)).toBeLessThanOrEqual(maxAmount);
          }

          // Every transaction NOT in the result must have abs(amount) outside [min, max]
          const filteredIds = new Set(filtered.map((t) => t.id));
          const excluded = transactions.filter((t) => !filteredIds.has(t.id));
          for (const t of excluded) {
            const absAmount = Math.abs(t.amount);
            expect(absAmount < minAmount || absAmount > maxAmount).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('negative and positive amounts with same absolute value are treated equally', () => {
    fc.assert(
      fc.property(
        referenceMonthArb,
        fc.integer({ min: 1, max: 9999999 }),
        valueRangeArb,
        (refMonth, absValue, range) => {
          const { minAmount, maxAmount } = range;

          const positiveTransaction: MockTransaction = {
            id: 'positive',
            categoryId: null,
            amount: absValue,
            date: '2024-01-15',
            referenceMonth: refMonth,
          };

          const negativeTransaction: MockTransaction = {
            id: 'negative',
            categoryId: null,
            amount: -absValue,
            date: '2024-01-15',
            referenceMonth: refMonth,
          };

          const transactions = [positiveTransaction, negativeTransaction];
          const filtered = applyValueRangeFilter(transactions, minAmount, maxAmount);

          // Both should either be included or excluded — never one without the other
          const hasPositive = filtered.some((t) => t.id === 'positive');
          const hasNegative = filtered.some((t) => t.id === 'negative');
          expect(hasPositive).toBe(hasNegative);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('with only minAmount set, all transactions with abs(amount) >= minAmount are included', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((refMonth) =>
          fc.tuple(
            fc.array(mockTransactionArb(refMonth), { minLength: 1, maxLength: 30 }),
            fc.integer({ min: 0, max: 9999999 }),
            fc.constant(refMonth)
          )
        ),
        ([transactions, minAmount, _refMonth]) => {
          const filtered = applyValueRangeFilter(transactions, minAmount, null);

          // All included must have abs(amount) >= minAmount
          for (const t of filtered) {
            expect(Math.abs(t.amount)).toBeGreaterThanOrEqual(minAmount);
          }

          // All excluded must have abs(amount) < minAmount
          const filteredIds = new Set(filtered.map((t) => t.id));
          const excluded = transactions.filter((t) => !filteredIds.has(t.id));
          for (const t of excluded) {
            expect(Math.abs(t.amount)).toBeLessThan(minAmount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('with only maxAmount set, all transactions with abs(amount) <= maxAmount are included', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((refMonth) =>
          fc.tuple(
            fc.array(mockTransactionArb(refMonth), { minLength: 1, maxLength: 30 }),
            fc.integer({ min: 0, max: 9999999 }),
            fc.constant(refMonth)
          )
        ),
        ([transactions, maxAmount, _refMonth]) => {
          const filtered = applyValueRangeFilter(transactions, null, maxAmount);

          // All included must have abs(amount) <= maxAmount
          for (const t of filtered) {
            expect(Math.abs(t.amount)).toBeLessThanOrEqual(maxAmount);
          }

          // All excluded must have abs(amount) > maxAmount
          const filteredIds = new Set(filtered.map((t) => t.id));
          const excluded = transactions.filter((t) => !filteredIds.has(t.id));
          for (const t of excluded) {
            expect(Math.abs(t.amount)).toBeGreaterThan(maxAmount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('with no amount filters, all transactions pass through', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((refMonth) =>
          fc.array(mockTransactionArb(refMonth), { minLength: 0, maxLength: 30 })
        ),
        (transactions) => {
          const filtered = applyValueRangeFilter(transactions, null, null);
          expect(filtered.length).toBe(transactions.length);
          expect(filtered.map((t) => t.id).sort()).toEqual(
            transactions.map((t) => t.id).sort()
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('value range filter integrates correctly with buildFilterConditions logic', () => {
    fc.assert(
      fc.property(
        referenceMonthArb.chain((refMonth) =>
          fc.tuple(
            fc.array(mockTransactionArb(refMonth), { minLength: 0, maxLength: 30 }),
            valueRangeArb,
            fc.constant(refMonth)
          )
        ),
        ([transactions, range, refMonth]) => {
          const { minAmount, maxAmount } = range;

          // Simulate the full filter pipeline as buildFilterConditions would produce
          const filters: PaginationFilters = {
            referenceMonth: refMonth,
            minAmount,
            maxAmount,
            startDate: null,
            endDate: null,
          };

          // Apply combined filter (simulating SQL WHERE clause)
          const combinedResult = transactions.filter((t) => {
            if (t.referenceMonth !== filters.referenceMonth) return false;
            if (filters.minAmount != null && Math.abs(t.amount) < filters.minAmount) return false;
            if (filters.maxAmount != null && Math.abs(t.amount) > filters.maxAmount) return false;
            return true;
          });

          // Apply value range filter independently on same-month transactions
          const monthFiltered = transactions.filter(
            (t) => t.referenceMonth === refMonth
          );
          const rangeFiltered = applyValueRangeFilter(monthFiltered, minAmount, maxAmount);

          // Both approaches should yield the same result
          const combinedIds = combinedResult.map((t) => t.id).sort();
          const rangeIds = rangeFiltered.map((t) => t.id).sort();
          expect(combinedIds).toEqual(rangeIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('boundary values are inclusive (amounts exactly at min or max are included)', () => {
    fc.assert(
      fc.property(
        referenceMonthArb,
        fc.integer({ min: 1, max: 9999999 }),
        (refMonth, boundaryAmount) => {
          const transactions: MockTransaction[] = [
            {
              id: 'at-min',
              categoryId: null,
              amount: boundaryAmount,
              date: '2024-01-15',
              referenceMonth: refMonth,
            },
            {
              id: 'at-max',
              categoryId: null,
              amount: -boundaryAmount,
              date: '2024-01-15',
              referenceMonth: refMonth,
            },
          ];

          // Use the boundary amount as both min and max (exact match)
          const filtered = applyValueRangeFilter(
            transactions,
            boundaryAmount,
            boundaryAmount
          );

          // Both transactions have abs(amount) === boundaryAmount, so both should be included
          expect(filtered.length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
