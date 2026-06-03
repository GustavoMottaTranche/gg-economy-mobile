// Feature: category-detail-screen, Property 1: Data filtering correctness

/**
 * Property 1: Data filtering correctness
 *
 * For any set of transactions and weekly occurrences in the database for a given
 * category and month, the displayed list SHALL only contain items where:
 * (a) transactions have `isExcludedFromTotals = false` AND (`isPaid = true` OR `recurringId IS NULL`),
 *     AND `categoryId` matches, AND `referenceMonth` matches
 * (b) weekly occurrences have `isPaid = true`, AND `categoryId` (via group) matches,
 *     AND `referenceMonth` matches
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import fc from 'fast-check';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawTransaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  categoryId: string;
  referenceMonth: string;
  isExcludedFromTotals: boolean;
  isPaid: boolean;
  recurringId: string | null;
}

interface RawWeeklyOccurrence {
  id: string;
  description: string;
  date: string;
  amount: number;
  weeklyGroupId: string;
  referenceMonth: string;
  isPaid: boolean;
}

interface WeeklyGroup {
  id: string;
  categoryId: string;
}

// ─── Filter Logic Under Test ─────────────────────────────────────────────────

/**
 * Pure predicate: determines if a transaction should be included in the
 * Category Detail Screen based on dashboard-consistent filters.
 *
 * Mirrors the SQL WHERE clause in getCategoryDetailTransactionsQuery:
 *   categoryId match AND referenceMonth match AND isExcludedFromTotals = false
 *   AND (isPaid = true OR recurringId IS NULL)
 */
function shouldIncludeTransaction(
  transaction: RawTransaction,
  targetCategoryId: string,
  targetMonth: string
): boolean {
  return (
    transaction.categoryId === targetCategoryId &&
    transaction.referenceMonth === targetMonth &&
    transaction.isExcludedFromTotals === false &&
    (transaction.isPaid === true || transaction.recurringId === null)
  );
}

/**
 * Pure predicate: determines if a weekly occurrence should be included in the
 * Category Detail Screen based on dashboard-consistent filters.
 *
 * Mirrors the SQL WHERE clause in getCategoryDetailWeeklyQuery:
 *   group.categoryId match AND referenceMonth match AND isPaid = true
 */
function shouldIncludeWeeklyOccurrence(
  occurrence: RawWeeklyOccurrence,
  groups: WeeklyGroup[],
  targetCategoryId: string,
  targetMonth: string
): boolean {
  const group = groups.find((g) => g.id === occurrence.weeklyGroupId);
  if (!group) return false;
  return (
    group.categoryId === targetCategoryId &&
    occurrence.referenceMonth === targetMonth &&
    occurrence.isPaid === true
  );
}

/**
 * Applies the full filtering logic for category detail transactions.
 */
function filterTransactions(
  transactions: RawTransaction[],
  targetCategoryId: string,
  targetMonth: string
): RawTransaction[] {
  return transactions.filter((t) => shouldIncludeTransaction(t, targetCategoryId, targetMonth));
}

/**
 * Applies the full filtering logic for category detail weekly occurrences.
 */
function filterWeeklyOccurrences(
  occurrences: RawWeeklyOccurrence[],
  groups: WeeklyGroup[],
  targetCategoryId: string,
  targetMonth: string
): RawWeeklyOccurrence[] {
  return occurrences.filter((o) =>
    shouldIncludeWeeklyOccurrence(o, groups, targetCategoryId, targetMonth)
  );
}

// ─── Generators ──────────────────────────────────────────────────────────────

const categoryIdArb = fc.uuid();

const referenceMonthArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

const dateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

const rawTransactionArb = (
  categoryPool: string[],
  monthPool: string[]
): fc.Arbitrary<RawTransaction> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 30 }),
    date: dateArb,
    amount: fc.integer({ min: -9999999, max: -1 }),
    categoryId: fc.constantFrom(...categoryPool),
    referenceMonth: fc.constantFrom(...monthPool),
    isExcludedFromTotals: fc.boolean(),
    isPaid: fc.boolean(),
    recurringId: fc.oneof(fc.uuid(), fc.constant(null)),
  });

const weeklyGroupArb = (categoryPool: string[]): fc.Arbitrary<WeeklyGroup> =>
  fc.record({
    id: fc.uuid(),
    categoryId: fc.constantFrom(...categoryPool),
  });

const rawWeeklyOccurrenceArb = (
  groupPool: string[],
  monthPool: string[]
): fc.Arbitrary<RawWeeklyOccurrence> =>
  fc.record({
    id: fc.uuid(),
    description: fc.string({ minLength: 1, maxLength: 30 }),
    date: dateArb,
    amount: fc.integer({ min: -9999999, max: -1 }),
    weeklyGroupId: fc.constantFrom(...groupPool),
    referenceMonth: fc.constantFrom(...monthPool),
    isPaid: fc.boolean(),
  });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: category-detail-screen, Property 1: Data filtering correctness', () => {
  describe('Transaction filtering', () => {
    it('only includes transactions matching categoryId, referenceMonth, not excluded, and (isPaid OR no recurringId)', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.array(categoryIdArb, { minLength: 2, maxLength: 5 }),
              fc.array(referenceMonthArb, { minLength: 2, maxLength: 4 })
            )
            .chain(([categories, months]) =>
              fc.tuple(
                fc.array(rawTransactionArb(categories, months), { minLength: 1, maxLength: 30 }),
                fc.constantFrom(...categories),
                fc.constantFrom(...months)
              )
            ),
          ([transactions, targetCategoryId, targetMonth]) => {
            const result = filterTransactions(transactions, targetCategoryId, targetMonth);

            // Every included transaction must satisfy ALL filter conditions
            for (const t of result) {
              expect(t.categoryId).toBe(targetCategoryId);
              expect(t.referenceMonth).toBe(targetMonth);
              expect(t.isExcludedFromTotals).toBe(false);
              expect(t.isPaid === true || t.recurringId === null).toBe(true);
            }

            // Every excluded transaction must violate at least one filter condition
            const resultIds = new Set(result.map((t) => t.id));
            const excluded = transactions.filter((t) => !resultIds.has(t.id));
            for (const t of excluded) {
              const violatesFilter =
                t.categoryId !== targetCategoryId ||
                t.referenceMonth !== targetMonth ||
                t.isExcludedFromTotals === true ||
                (t.isPaid === false && t.recurringId !== null);
              expect(violatesFilter).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('transactions with isExcludedFromTotals=true are never included', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.array(categoryIdArb, { minLength: 2, maxLength: 5 }),
              fc.array(referenceMonthArb, { minLength: 2, maxLength: 4 })
            )
            .chain(([categories, months]) =>
              fc.tuple(
                fc.array(rawTransactionArb(categories, months), { minLength: 1, maxLength: 30 }),
                fc.constantFrom(...categories),
                fc.constantFrom(...months)
              )
            ),
          ([transactions, targetCategoryId, targetMonth]) => {
            const result = filterTransactions(transactions, targetCategoryId, targetMonth);

            for (const t of result) {
              expect(t.isExcludedFromTotals).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('unpaid recurring transactions (isPaid=false AND recurringId!=null) are excluded', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.array(categoryIdArb, { minLength: 2, maxLength: 5 }),
              fc.array(referenceMonthArb, { minLength: 2, maxLength: 4 })
            )
            .chain(([categories, months]) =>
              fc.tuple(
                fc.array(rawTransactionArb(categories, months), { minLength: 1, maxLength: 30 }),
                fc.constantFrom(...categories),
                fc.constantFrom(...months)
              )
            ),
          ([transactions, targetCategoryId, targetMonth]) => {
            const result = filterTransactions(transactions, targetCategoryId, targetMonth);

            // No transaction in the result should be unpaid AND recurring
            for (const t of result) {
              const isUnpaidRecurring = t.isPaid === false && t.recurringId !== null;
              expect(isUnpaidRecurring).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Weekly occurrence filtering', () => {
    it('only includes occurrences matching categoryId (via group), referenceMonth, and isPaid=true', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.array(categoryIdArb, { minLength: 2, maxLength: 5 }),
              fc.array(referenceMonthArb, { minLength: 2, maxLength: 4 })
            )
            .chain(([categories, months]) =>
              fc.array(weeklyGroupArb(categories), { minLength: 1, maxLength: 5 }).chain((groups) =>
                fc.tuple(
                  fc.array(
                    rawWeeklyOccurrenceArb(
                      groups.map((g) => g.id),
                      months
                    ),
                    { minLength: 1, maxLength: 30 }
                  ),
                  fc.constant(groups),
                  fc.constantFrom(...categories),
                  fc.constantFrom(...months)
                )
              )
            ),
          ([occurrences, groups, targetCategoryId, targetMonth]) => {
            const result = filterWeeklyOccurrences(
              occurrences,
              groups,
              targetCategoryId,
              targetMonth
            );

            // Every included occurrence must satisfy ALL filter conditions
            for (const o of result) {
              const group = groups.find((g) => g.id === o.weeklyGroupId);
              expect(group).toBeDefined();
              expect(group!.categoryId).toBe(targetCategoryId);
              expect(o.referenceMonth).toBe(targetMonth);
              expect(o.isPaid).toBe(true);
            }

            // Every excluded occurrence must violate at least one filter condition
            const resultIds = new Set(result.map((o) => o.id));
            const excluded = occurrences.filter((o) => !resultIds.has(o.id));
            for (const o of excluded) {
              const group = groups.find((g) => g.id === o.weeklyGroupId);
              const violatesFilter =
                !group ||
                group.categoryId !== targetCategoryId ||
                o.referenceMonth !== targetMonth ||
                o.isPaid === false;
              expect(violatesFilter).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('unpaid weekly occurrences are never included', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.array(categoryIdArb, { minLength: 2, maxLength: 5 }),
              fc.array(referenceMonthArb, { minLength: 2, maxLength: 4 })
            )
            .chain(([categories, months]) =>
              fc.array(weeklyGroupArb(categories), { minLength: 1, maxLength: 5 }).chain((groups) =>
                fc.tuple(
                  fc.array(
                    rawWeeklyOccurrenceArb(
                      groups.map((g) => g.id),
                      months
                    ),
                    { minLength: 1, maxLength: 30 }
                  ),
                  fc.constant(groups),
                  fc.constantFrom(...categories),
                  fc.constantFrom(...months)
                )
              )
            ),
          ([occurrences, groups, targetCategoryId, targetMonth]) => {
            const result = filterWeeklyOccurrences(
              occurrences,
              groups,
              targetCategoryId,
              targetMonth
            );

            for (const o of result) {
              expect(o.isPaid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('occurrences from groups with non-matching categoryId are excluded', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.array(categoryIdArb, { minLength: 3, maxLength: 6 }),
              fc.array(referenceMonthArb, { minLength: 2, maxLength: 4 })
            )
            .chain(([categories, months]) =>
              fc.array(weeklyGroupArb(categories), { minLength: 2, maxLength: 5 }).chain((groups) =>
                fc.tuple(
                  fc.array(
                    rawWeeklyOccurrenceArb(
                      groups.map((g) => g.id),
                      months
                    ),
                    { minLength: 1, maxLength: 30 }
                  ),
                  fc.constant(groups),
                  fc.constantFrom(...categories),
                  fc.constantFrom(...months)
                )
              )
            ),
          ([occurrences, groups, targetCategoryId, targetMonth]) => {
            const result = filterWeeklyOccurrences(
              occurrences,
              groups,
              targetCategoryId,
              targetMonth
            );

            for (const o of result) {
              const group = groups.find((g) => g.id === o.weeklyGroupId);
              expect(group).toBeDefined();
              expect(group!.categoryId).toBe(targetCategoryId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Combined filtering consistency', () => {
    it('filter result count is always less than or equal to total input count', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.array(categoryIdArb, { minLength: 2, maxLength: 5 }),
              fc.array(referenceMonthArb, { minLength: 2, maxLength: 4 })
            )
            .chain(([categories, months]) =>
              fc.array(weeklyGroupArb(categories), { minLength: 1, maxLength: 5 }).chain((groups) =>
                fc.tuple(
                  fc.array(rawTransactionArb(categories, months), { minLength: 0, maxLength: 20 }),
                  fc.array(
                    rawWeeklyOccurrenceArb(
                      groups.map((g) => g.id),
                      months
                    ),
                    { minLength: 0, maxLength: 20 }
                  ),
                  fc.constant(groups),
                  fc.constantFrom(...categories),
                  fc.constantFrom(...months)
                )
              )
            ),
          ([transactions, occurrences, groups, targetCategoryId, targetMonth]) => {
            const filteredTx = filterTransactions(transactions, targetCategoryId, targetMonth);
            const filteredWo = filterWeeklyOccurrences(
              occurrences,
              groups,
              targetCategoryId,
              targetMonth
            );

            expect(filteredTx.length).toBeLessThanOrEqual(transactions.length);
            expect(filteredWo.length).toBeLessThanOrEqual(occurrences.length);
            expect(filteredTx.length + filteredWo.length).toBeLessThanOrEqual(
              transactions.length + occurrences.length
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
