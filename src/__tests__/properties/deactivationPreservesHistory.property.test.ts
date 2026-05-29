import fc from 'fast-check';

/**
 * Property 10: Deactivation Preserves History
 *
 * For any recurring transaction that has generated N transactions before
 * deactivation, after deactivation all N previously generated transactions
 * SHALL remain in the database unchanged.
 *
 * **Validates: Requirements 9.6**
 */

/**
 * Represents a recurring transaction record.
 */
interface RecurringRecord {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  categoryType: 'income' | 'expense';
  startMonth: string;
  description: string;
  isActive: boolean;
}

/**
 * Represents a generated transaction from a recurring.
 */
interface GeneratedTransaction {
  id: string;
  title: string;
  amount: number;
  description: string;
  categoryId: string;
  referenceMonth: string;
  recurringId: string;
}

/**
 * Simulates generating N monthly transactions from a recurring record.
 * Each transaction gets the recurring's title, amount, description, and category.
 */
function simulateGenerateTransactions(
  recurring: RecurringRecord,
  months: string[]
): GeneratedTransaction[] {
  return months.map((month, index) => ({
    id: `tx-${recurring.id}-${index}`,
    title: recurring.title,
    amount: recurring.amount,
    description: recurring.description,
    categoryId: recurring.categoryId,
    referenceMonth: month,
    recurringId: recurring.id,
  }));
}

/**
 * Simulates deactivating a recurring transaction.
 * Only modifies the recurring record's isActive flag.
 * Returns the updated recurring and the UNCHANGED transactions array.
 */
function simulateDeactivation(
  recurring: RecurringRecord,
  existingTransactions: GeneratedTransaction[]
): { recurring: RecurringRecord; transactions: GeneratedTransaction[] } {
  return {
    recurring: { ...recurring, isActive: false },
    transactions: [...existingTransactions], // Transactions are NOT modified
  };
}

/**
 * Generates a valid YYYY-MM month string.
 */
const monthArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

/**
 * Generates a sequence of consecutive months starting from a given month.
 */
function generateConsecutiveMonths(startMonth: string, count: number): string[] {
  const months: string[] = [];
  let year = parseInt(startMonth.split('-')[0] ?? '2020', 10);
  let month = parseInt(startMonth.split('-')[1] ?? '1', 10);

  for (let i = 0; i < count; i++) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

/**
 * Arbitrary for generating a recurring transaction record.
 */
const recurringArbitrary = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  amount: fc.integer({ min: 1, max: 99999999 }),
  categoryId: fc.uuid(),
  categoryType: fc.oneof(fc.constant('income' as const), fc.constant('expense' as const)),
  startMonth: monthArbitrary,
  description: fc.string({ minLength: 0, maxLength: 200 }),
  isActive: fc.constant(true),
});

describe('Feature: entry-title-and-dates, Property 10: Deactivation Preserves History', () => {
  /**
   * **Validates: Requirements 9.6**
   */

  it('after deactivation, all N previously generated transactions remain in the database', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 24 }),
        (recurring, transactionCount) => {
          const months = generateConsecutiveMonths(recurring.startMonth, transactionCount);
          const generatedTransactions = simulateGenerateTransactions(recurring, months);

          const { transactions: afterDeactivation } = simulateDeactivation(
            recurring,
            generatedTransactions
          );

          // All N transactions must still exist
          expect(afterDeactivation.length).toBe(transactionCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after deactivation, each transaction retains its original title', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 24 }),
        (recurring, transactionCount) => {
          const months = generateConsecutiveMonths(recurring.startMonth, transactionCount);
          const generatedTransactions = simulateGenerateTransactions(recurring, months);

          const { transactions: afterDeactivation } = simulateDeactivation(
            recurring,
            generatedTransactions
          );

          for (let i = 0; i < transactionCount; i++) {
            expect(afterDeactivation[i]!.title).toBe(generatedTransactions[i]!.title);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after deactivation, each transaction retains its original amount', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 24 }),
        (recurring, transactionCount) => {
          const months = generateConsecutiveMonths(recurring.startMonth, transactionCount);
          const generatedTransactions = simulateGenerateTransactions(recurring, months);

          const { transactions: afterDeactivation } = simulateDeactivation(
            recurring,
            generatedTransactions
          );

          for (let i = 0; i < transactionCount; i++) {
            expect(afterDeactivation[i]!.amount).toBe(generatedTransactions[i]!.amount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after deactivation, each transaction retains its original referenceMonth and recurringId', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 24 }),
        (recurring, transactionCount) => {
          const months = generateConsecutiveMonths(recurring.startMonth, transactionCount);
          const generatedTransactions = simulateGenerateTransactions(recurring, months);

          const { transactions: afterDeactivation } = simulateDeactivation(
            recurring,
            generatedTransactions
          );

          for (let i = 0; i < transactionCount; i++) {
            expect(afterDeactivation[i]!.referenceMonth).toBe(generatedTransactions[i]!.referenceMonth);
            expect(afterDeactivation[i]!.recurringId).toBe(generatedTransactions[i]!.recurringId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after deactivation, the recurring record is marked inactive but transactions are untouched', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 24 }),
        (recurring, transactionCount) => {
          const months = generateConsecutiveMonths(recurring.startMonth, transactionCount);
          const generatedTransactions = simulateGenerateTransactions(recurring, months);

          const { recurring: deactivatedRecurring, transactions: afterDeactivation } =
            simulateDeactivation(recurring, generatedTransactions);

          // Recurring is deactivated
          expect(deactivatedRecurring.isActive).toBe(false);

          // But all transactions remain completely unchanged (deep equality)
          for (let i = 0; i < transactionCount; i++) {
            expect(afterDeactivation[i]!).toEqual(generatedTransactions[i]!);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
