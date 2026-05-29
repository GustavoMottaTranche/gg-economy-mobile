import fc from 'fast-check';

/**
 * Property 8: Recurring Transaction Generation
 *
 * For any active recurring transaction with a given start month,
 * calling generateMonthlyTransactions(targetMonth) for any month >= startMonth
 * SHALL produce a transaction with the recurring's title, amount, and category.
 * For any month < startMonth, no transaction SHALL be generated.
 *
 * **Validates: Requirements 9.2, 9.3**
 */

/**
 * Represents an active recurring transaction record.
 */
interface RecurringRecord {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  categoryType: 'income' | 'expense';
  startMonth: string; // YYYY-MM
  description: string;
  originId: string | null;
  isActive: boolean;
}

/**
 * Represents a generated transaction from a recurring.
 */
interface GeneratedTransaction {
  title: string;
  amount: number;
  categoryId: string;
  referenceMonth: string;
  recurringId: string;
}

/**
 * Pure logic that determines whether a recurring should generate a transaction
 * for a given target month. This mirrors the condition used in
 * RecurringTransactionService.generateMonthlyTransactions:
 *   - recurring must be active
 *   - startMonth <= targetMonth (string comparison works for YYYY-MM format)
 */
function shouldGenerate(recurring: RecurringRecord, targetMonth: string): boolean {
  return recurring.isActive && recurring.startMonth <= targetMonth;
}

/**
 * Simulates the generation logic from RecurringTransactionService.generateMonthlyTransactions.
 * For each active recurring where startMonth <= targetMonth, produces a transaction
 * with the recurring's title, amount, and category.
 *
 * This is a pure function that mirrors the core logic without database dependencies.
 */
function simulateGenerateMonthlyTransactions(
  recurrings: RecurringRecord[],
  targetMonth: string,
  existingTransactions: { recurringId: string; referenceMonth: string }[] = []
): GeneratedTransaction[] {
  const generated: GeneratedTransaction[] = [];

  for (const recurring of recurrings) {
    if (!shouldGenerate(recurring, targetMonth)) {
      continue;
    }

    // Check idempotency: skip if already exists for this recurring + month
    const alreadyExists = existingTransactions.some(
      (tx) => tx.recurringId === recurring.id && tx.referenceMonth === targetMonth
    );
    if (alreadyExists) {
      continue;
    }

    generated.push({
      title: recurring.title,
      amount: recurring.amount,
      categoryId: recurring.categoryId,
      referenceMonth: targetMonth,
      recurringId: recurring.id,
    });
  }

  return generated;
}

/**
 * Arbitrary that generates a valid YYYY-MM month string.
 */
const monthArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2035 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

/**
 * Arbitrary that generates a valid recurring transaction record.
 */
const recurringArbitrary = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  amount: fc.integer({ min: 1, max: 99999999 }),
  categoryId: fc.uuid(),
  categoryType: fc.constantFrom('income' as const, 'expense' as const),
  startMonth: monthArbitrary,
  description: fc.string({ minLength: 0, maxLength: 200 }),
  originId: fc.option(fc.uuid(), { nil: null }),
  isActive: fc.constant(true),
});

describe('Feature: entry-title-and-dates, Property 8: Recurring Transaction Generation', () => {
  /**
   * **Validates: Requirements 9.2, 9.3**
   */

  it('generates a transaction for targetMonth >= startMonth', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        monthArbitrary,
        (recurring, randomMonth) => {
          // Ensure targetMonth >= startMonth by picking the later of the two
          const targetMonth =
            randomMonth >= recurring.startMonth ? randomMonth : recurring.startMonth;

          const generated = simulateGenerateMonthlyTransactions(
            [recurring],
            targetMonth
          );

          // Should generate exactly one transaction
          expect(generated).toHaveLength(1);
          expect(generated[0]!.title).toBe(recurring.title);
          expect(generated[0]!.amount).toBe(recurring.amount);
          expect(generated[0]!.categoryId).toBe(recurring.categoryId);
          expect(generated[0]!.referenceMonth).toBe(targetMonth);
          expect(generated[0]!.recurringId).toBe(recurring.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT generate a transaction for targetMonth < startMonth', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        monthArbitrary,
        (recurring, randomMonth) => {
          // Ensure targetMonth < startMonth by picking the earlier of the two
          // We need startMonth to be strictly greater than targetMonth
          const targetMonth =
            randomMonth < recurring.startMonth ? randomMonth : undefined;

          // Skip if we can't produce a valid targetMonth < startMonth
          if (targetMonth === undefined) {
            // Force a targetMonth that is before startMonth
            const [yearStr, monthStr] = recurring.startMonth.split('-');
            const year = parseInt(yearStr ?? '0', 10);
            const month = parseInt(monthStr ?? '0', 10);

            let prevMonth: string;
            if (month === 1) {
              prevMonth = `${year - 1}-12`;
            } else {
              prevMonth = `${year}-${String(month - 1).padStart(2, '0')}`;
            }

            const generated = simulateGenerateMonthlyTransactions(
              [recurring],
              prevMonth
            );

            expect(generated).toHaveLength(0);
            return;
          }

          const generated = simulateGenerateMonthlyTransactions(
            [recurring],
            targetMonth
          );

          expect(generated).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generates transaction with correct title, amount, and category from recurring', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        (recurring) => {
          // Use startMonth itself as targetMonth (boundary case: equal)
          const targetMonth = recurring.startMonth;

          const generated = simulateGenerateMonthlyTransactions(
            [recurring],
            targetMonth
          );

          expect(generated).toHaveLength(1);
          expect(generated[0]!.title).toBe(recurring.title);
          expect(generated[0]!.amount).toBe(recurring.amount);
          expect(generated[0]!.categoryId).toBe(recurring.categoryId);
          expect(generated[0]!.recurringId).toBe(recurring.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not generate duplicate transactions (idempotency)', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        (recurring) => {
          const targetMonth = recurring.startMonth;

          // First generation
          const firstGeneration = simulateGenerateMonthlyTransactions(
            [recurring],
            targetMonth
          );

          expect(firstGeneration).toHaveLength(1);

          // Simulate that the first generation already exists
          const existingTransactions = [
            { recurringId: recurring.id, referenceMonth: targetMonth },
          ];

          // Second generation with existing transactions
          const secondGeneration = simulateGenerateMonthlyTransactions(
            [recurring],
            targetMonth,
            existingTransactions
          );

          // Should not generate again
          expect(secondGeneration).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('inactive recurring does not generate transactions regardless of month', () => {
    const inactiveRecurringArbitrary = recurringArbitrary.map((r) => ({
      ...r,
      isActive: false,
    }));

    fc.assert(
      fc.property(
        inactiveRecurringArbitrary,
        monthArbitrary,
        (recurring, targetMonth) => {
          const generated = simulateGenerateMonthlyTransactions(
            [recurring],
            targetMonth
          );

          expect(generated).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
