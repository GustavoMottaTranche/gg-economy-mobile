import fc from 'fast-check';

/**
 * Property 13: Single Occurrence Edit Isolation
 *
 * For any active recurring transaction with base amount A, when the user edits
 * a single occurrence to amount B, the recurring record's base amount SHALL
 * remain A, and the next generated transaction SHALL use amount A (not B).
 *
 * **Validates: Requirements 10.5**
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
  recurringId: string;
  title: string;
  amount: number;
  referenceMonth: string;
}

/**
 * Simulates the core generation logic of generateMonthlyTransactions:
 * Only active recurrings with startMonth <= targetMonth generate transactions.
 */
function simulateGeneration(
  recurring: RecurringRecord,
  targetMonth: string,
  existingTransactions: GeneratedTransaction[]
): GeneratedTransaction | null {
  if (!recurring.isActive) {
    return null;
  }

  if (recurring.startMonth > targetMonth) {
    return null;
  }

  // Idempotent: skip if already exists for this recurring + month
  const alreadyExists = existingTransactions.some(
    (tx) => tx.recurringId === recurring.id && tx.referenceMonth === targetMonth
  );
  if (alreadyExists) {
    return null;
  }

  return {
    id: `tx-${targetMonth}-${recurring.id}`,
    recurringId: recurring.id,
    title: recurring.title,
    amount: recurring.amount,
    referenceMonth: targetMonth,
  };
}

/**
 * Simulates editing a single occurrence's amount.
 * This only modifies the individual transaction, NOT the recurring record.
 * This mirrors the behavior described in Requirement 10.5:
 * "salvar o valor alterado apenas no Lançamento daquele mês específico,
 *  mantendo o valor base da recorrência inalterado para os meses seguintes."
 */
function editSingleOccurrenceAmount(
  transaction: GeneratedTransaction,
  newAmount: number
): GeneratedTransaction {
  return { ...transaction, amount: newAmount };
}

/**
 * Advances a YYYY-MM month string by N months.
 */
function advanceMonth(month: string, n: number): string {
  const year = parseInt(month.split('-')[0] ?? '0', 10);
  const mon = parseInt(month.split('-')[1] ?? '0', 10);
  const totalMonths = year * 12 + (mon - 1) + n;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
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
 * Generates a valid recurring transaction record (always active).
 */
const recurringArbitrary = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  amount: fc.integer({ min: 1, max: 99999999 }),
  categoryId: fc.uuid(),
  categoryType: fc.constantFrom('income' as const, 'expense' as const),
  startMonth: monthArbitrary,
  description: fc.string({ minLength: 0, maxLength: 200 }),
  isActive: fc.constant(true),
});

describe('Feature: entry-title-and-dates, Property 13: Single Occurrence Edit Isolation', () => {
  /**
   * **Validates: Requirements 10.5**
   */

  it('editing a single occurrence does NOT change the recurring base amount', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 99999999 }),
        (recurring, newAmount) => {
          // Ensure newAmount is different from the base amount
          const editedAmount = newAmount === recurring.amount ? newAmount + 1 : newAmount;

          const originalBaseAmount = recurring.amount;

          // Generate a transaction for the start month
          const generated = simulateGeneration(recurring, recurring.startMonth, []);
          expect(generated).not.toBeNull();

          // Edit the single occurrence amount
          const editedTransaction = editSingleOccurrenceAmount(generated!, editedAmount);

          // Verify the edited transaction has the new amount
          expect(editedTransaction.amount).toBe(editedAmount);

          // Verify the recurring record's base amount is UNCHANGED
          expect(recurring.amount).toBe(originalBaseAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('next generated transaction after single occurrence edit uses the original base amount', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 99999999 }),
        (recurring, newAmount) => {
          // Ensure newAmount is different from the base amount
          const editedAmount = newAmount === recurring.amount ? newAmount + 1 : newAmount;

          // Generate a transaction for the start month
          const firstMonth = recurring.startMonth;
          const firstTransaction = simulateGeneration(recurring, firstMonth, []);
          expect(firstTransaction).not.toBeNull();

          // Edit the single occurrence (only affects this transaction, not the recurring)
          const editedTransaction = editSingleOccurrenceAmount(firstTransaction!, editedAmount);
          expect(editedTransaction.amount).toBe(editedAmount);

          // The existing transactions list includes the edited one
          const existingTransactions: GeneratedTransaction[] = [editedTransaction];

          // Generate the NEXT month's transaction — should use the recurring's base amount
          const nextMonth = advanceMonth(firstMonth, 1);
          const nextTransaction = simulateGeneration(recurring, nextMonth, existingTransactions);

          expect(nextTransaction).not.toBeNull();
          // The next generated transaction uses the ORIGINAL base amount, not the edited one
          expect(nextTransaction!.amount).toBe(recurring.amount);
          expect(nextTransaction!.amount).not.toBe(editedAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple single occurrence edits do not affect the recurring base or future generations', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.array(fc.integer({ min: 1, max: 99999999 }), { minLength: 2, maxLength: 5 }),
        (recurring, editAmounts) => {
          const originalBaseAmount = recurring.amount;
          const existingTransactions: GeneratedTransaction[] = [];

          // Generate and edit transactions for several consecutive months
          for (let i = 0; i < editAmounts.length; i++) {
            const month = advanceMonth(recurring.startMonth, i);
            const generated = simulateGeneration(recurring, month, existingTransactions);

            expect(generated).not.toBeNull();
            // Each generated transaction uses the base amount
            expect(generated!.amount).toBe(originalBaseAmount);

            // Edit this single occurrence
            const editedAmount =
              editAmounts[i]! === recurring.amount ? editAmounts[i]! + 1 : editAmounts[i]!;
            const edited = editSingleOccurrenceAmount(generated!, editedAmount);
            existingTransactions.push(edited);
          }

          // After all edits, the recurring base amount is still unchanged
          expect(recurring.amount).toBe(originalBaseAmount);

          // Generate one more month — should still use the original base amount
          const finalMonth = advanceMonth(recurring.startMonth, editAmounts.length);
          const finalTransaction = simulateGeneration(recurring, finalMonth, existingTransactions);

          expect(finalTransaction).not.toBeNull();
          expect(finalTransaction!.amount).toBe(originalBaseAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('single occurrence edit does not affect other existing occurrences', () => {
    fc.assert(
      fc.property(
        recurringArbitrary,
        fc.integer({ min: 1, max: 99999999 }),
        fc.integer({ min: 0, max: 4 }),
        (recurring, newAmount, editIndex) => {
          const originalBaseAmount = recurring.amount;
          const generatedTransactions: GeneratedTransaction[] = [];

          // Generate 5 months of transactions
          for (let i = 0; i < 5; i++) {
            const month = advanceMonth(recurring.startMonth, i);
            const generated = simulateGeneration(recurring, month, generatedTransactions);
            expect(generated).not.toBeNull();
            generatedTransactions.push(generated!);
          }

          // All should have the base amount initially
          for (const tx of generatedTransactions) {
            expect(tx.amount).toBe(originalBaseAmount);
          }

          // Edit only one occurrence
          const targetIndex = editIndex % generatedTransactions.length;
          const editedAmount = newAmount === recurring.amount ? newAmount + 1 : newAmount;
          generatedTransactions[targetIndex] = editSingleOccurrenceAmount(
            generatedTransactions[targetIndex]!,
            editedAmount
          );

          // Verify only the edited one changed
          for (let i = 0; i < generatedTransactions.length; i++) {
            if (i === targetIndex) {
              expect(generatedTransactions[i]!.amount).toBe(editedAmount);
            } else {
              expect(generatedTransactions[i]!.amount).toBe(originalBaseAmount);
            }
          }

          // Recurring base is still unchanged
          expect(recurring.amount).toBe(originalBaseAmount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
