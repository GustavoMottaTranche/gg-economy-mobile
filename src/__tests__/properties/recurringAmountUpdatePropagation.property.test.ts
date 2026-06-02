import fc from 'fast-check';

/**
 * Property 12: Recurring Amount Update Propagation
 *
 * For any active recurring transaction, when the user applies a value change
 * to "all future occurrences", the recurring record's base amount SHALL equal
 * the new value, and all subsequently generated transactions SHALL use the new amount.
 *
 * **Validates: Requirements 10.4**
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
 * Simulates updateRecurringAmount: updates the base amount of a recurring record.
 * This mirrors RecurringTransactionService.updateRecurringAmount.
 */
function simulateUpdateRecurringAmount(
  recurring: RecurringRecord,
  newAmount: number
): RecurringRecord {
  return {
    ...recurring,
    amount: newAmount,
  };
}

/**
 * Simulates the generation logic from RecurringTransactionService.generateMonthlyTransactions.
 * For each active recurring where startMonth <= targetMonth, produces a transaction
 * with the recurring's current title, amount, and category.
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
    if (!recurring.isActive || recurring.startMonth > targetMonth) {
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
 * Advances a YYYY-MM month string by N months.
 */
function advanceMonth(month: string, n: number): string {
  const [yearStr, monthStr] = month.split('-');
  let year = parseInt(yearStr ?? '0', 10);
  let m = parseInt(monthStr ?? '0', 10) - 1; // 0-indexed

  m += n;
  year += Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;

  return `${year}-${String(m + 1).padStart(2, '0')}`;
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
 * Arbitrary that generates a valid active recurring transaction record.
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

describe('Feature: entry-title-and-dates, Property 12: Recurring Amount Update Propagation', () => {
  /**
   * **Validates: Requirements 10.4**
   */

  it('after updating base amount, the recurring record reflects the new amount', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 99999999 }),
        (recurring, newAmount) => {
          // Precondition: new amount is different from original
          fc.pre(newAmount !== recurring.amount);

          const updated = simulateUpdateRecurringAmount(recurring, newAmount);

          expect(updated.amount).toBe(newAmount);
          expect(updated.id).toBe(recurring.id);
          expect(updated.title).toBe(recurring.title);
          expect(updated.categoryId).toBe(recurring.categoryId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('subsequently generated transactions use the new base amount after update', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 99999999 }),
        fc.integer({ min: 1, max: 12 }),
        (recurring, newAmount, monthsAhead) => {
          // Precondition: new amount is different from original
          fc.pre(newAmount !== recurring.amount);

          // Step 1: Update the recurring base amount
          const updatedRecurring = simulateUpdateRecurringAmount(recurring, newAmount);

          // Step 2: Generate a transaction for a future month
          const futureMonth = advanceMonth(recurring.startMonth, monthsAhead);
          const generated = simulateGenerateMonthlyTransactions([updatedRecurring], futureMonth);

          // Step 3: Verify the generated transaction uses the new amount
          expect(generated).toHaveLength(1);
          expect(generated[0]!.amount).toBe(newAmount);
          expect(generated[0]!.title).toBe(recurring.title);
          expect(generated[0]!.categoryId).toBe(recurring.categoryId);
          expect(generated[0]!.recurringId).toBe(recurring.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple future months all use the updated amount', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 99999999 }),
        fc.integer({ min: 2, max: 6 }),
        (recurring, newAmount, numMonths) => {
          // Precondition: new amount is different from original
          fc.pre(newAmount !== recurring.amount);

          // Step 1: Update the recurring base amount
          const updatedRecurring = simulateUpdateRecurringAmount(recurring, newAmount);

          // Step 2: Generate transactions for multiple future months sequentially
          const existingTransactions: { recurringId: string; referenceMonth: string }[] = [];
          const allGenerated: GeneratedTransaction[] = [];

          for (let i = 1; i <= numMonths; i++) {
            const futureMonth = advanceMonth(recurring.startMonth, i);
            const generated = simulateGenerateMonthlyTransactions(
              [updatedRecurring],
              futureMonth,
              existingTransactions
            );

            // Track generated as existing for idempotency
            for (const tx of generated) {
              existingTransactions.push({
                recurringId: tx.recurringId,
                referenceMonth: tx.referenceMonth,
              });
            }

            allGenerated.push(...generated);
          }

          // Step 3: Verify all generated transactions use the new amount
          expect(allGenerated).toHaveLength(numMonths);
          for (const tx of allGenerated) {
            expect(tx.amount).toBe(newAmount);
            expect(tx.recurringId).toBe(recurring.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('transactions generated before the update retain the old amount', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 99999999 }),
        (recurring, newAmount) => {
          // Precondition: new amount is different from original
          fc.pre(newAmount !== recurring.amount);

          // Step 1: Generate a transaction BEFORE the update (at startMonth)
          const preUpdateGenerated = simulateGenerateMonthlyTransactions(
            [recurring],
            recurring.startMonth
          );

          expect(preUpdateGenerated).toHaveLength(1);
          expect(preUpdateGenerated[0]!.amount).toBe(recurring.amount);

          // Step 2: Update the recurring base amount
          const updatedRecurring = simulateUpdateRecurringAmount(recurring, newAmount);

          // Step 3: Generate a transaction AFTER the update (next month)
          const futureMonth = advanceMonth(recurring.startMonth, 1);
          const existingTransactions = [
            { recurringId: recurring.id, referenceMonth: recurring.startMonth },
          ];
          const postUpdateGenerated = simulateGenerateMonthlyTransactions(
            [updatedRecurring],
            futureMonth,
            existingTransactions
          );

          // Step 4: Verify pre-update transaction has old amount, post-update has new
          expect(preUpdateGenerated[0]!.amount).toBe(recurring.amount);
          expect(postUpdateGenerated).toHaveLength(1);
          expect(postUpdateGenerated[0]!.amount).toBe(newAmount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
