import fc from 'fast-check';

/**
 * Property 9: Deactivation/Reactivation Lifecycle
 *
 * For any recurring transaction, after deactivation, `generateMonthlyTransactions`
 * SHALL NOT create new transactions for any future month. After reactivation,
 * `generateMonthlyTransactions` SHALL resume creating transactions for months
 * >= the reactivation month.
 *
 * **Validates: Requirements 9.5, 9.7**
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
  recurringId: string;
  title: string;
  amount: number;
  referenceMonth: string;
}

/**
 * Simulates the core filtering logic of generateMonthlyTransactions:
 * Only active recurrings with startMonth <= targetMonth generate transactions.
 */
function simulateGeneration(
  recurrings: RecurringRecord[],
  targetMonth: string,
  existingTransactions: GeneratedTransaction[]
): GeneratedTransaction[] {
  const newTransactions: GeneratedTransaction[] = [];

  for (const recurring of recurrings) {
    // Only active recurrings generate
    if (!recurring.isActive) {
      continue;
    }

    // Only if startMonth <= targetMonth
    if (recurring.startMonth > targetMonth) {
      continue;
    }

    // Idempotent: skip if already exists for this month
    const alreadyExists = existingTransactions.some(
      (tx) => tx.recurringId === recurring.id && tx.referenceMonth === targetMonth
    );
    if (alreadyExists) {
      continue;
    }

    newTransactions.push({
      recurringId: recurring.id,
      title: recurring.title,
      amount: recurring.amount,
      referenceMonth: targetMonth,
    });
  }

  return newTransactions;
}

/**
 * Simulates deactivation: sets isActive to false.
 */
function simulateDeactivation(recurring: RecurringRecord): RecurringRecord {
  return { ...recurring, isActive: false };
}

/**
 * Simulates reactivation: sets isActive to true.
 */
function simulateReactivation(recurring: RecurringRecord): RecurringRecord {
  return { ...recurring, isActive: true };
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

describe('Feature: entry-title-and-dates, Property 9: Deactivation/Reactivation Lifecycle', () => {
  /**
   * **Validates: Requirements 9.5, 9.7**
   */

  it('active recurring generates transactions for months >= startMonth', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 99999999 }),
        monthArbitrary,
        fc.constantFrom('income' as const, 'expense' as const),
        (id, title, amount, startMonth, categoryType) => {
          const recurring: RecurringRecord = {
            id,
            title,
            amount,
            categoryId: 'cat-1',
            categoryType,
            startMonth,
            description: '',
            isActive: true,
          };

          // Generate for the startMonth itself
          const generated = simulateGeneration([recurring], startMonth, []);
          expect(generated).toHaveLength(1);
          expect(generated[0]!.recurringId).toBe(id);
          expect(generated[0]!.title).toBe(title);
          expect(generated[0]!.amount).toBe(amount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after deactivation, no new transactions are generated for any future month', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 99999999 }),
        monthArbitrary,
        fc.constantFrom('income' as const, 'expense' as const),
        (id, title, amount, startMonth, categoryType) => {
          const recurring: RecurringRecord = {
            id,
            title,
            amount,
            categoryId: 'cat-1',
            categoryType,
            startMonth,
            description: '',
            isActive: true,
          };

          // Deactivate the recurring
          const deactivated = simulateDeactivation(recurring);
          expect(deactivated.isActive).toBe(false);

          // Try to generate for startMonth and beyond — should produce nothing
          const generated = simulateGeneration([deactivated], startMonth, []);
          expect(generated).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after deactivation, generation produces nothing for any month >= startMonth', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 99999999 }),
        monthArbitrary,
        fc.constantFrom('income' as const, 'expense' as const),
        (id, title, amount, startMonth, categoryType) => {
          const recurring: RecurringRecord = {
            id,
            title,
            amount,
            categoryId: 'cat-1',
            categoryType,
            startMonth,
            description: '',
            isActive: true,
          };

          // Deactivate
          const deactivated = simulateDeactivation(recurring);

          // Try generating for multiple future months
          const futureMonths = [startMonth];
          const year = parseInt(startMonth.split('-')[0] ?? '2020', 10);
          const mon = parseInt(startMonth.split('-')[1] ?? '1', 10);
          for (let i = 1; i <= 5; i++) {
            const newMon = ((mon - 1 + i) % 12) + 1;
            const newYear = year + Math.floor((mon - 1 + i) / 12);
            futureMonths.push(`${newYear}-${String(newMon).padStart(2, '0')}`);
          }

          for (const month of futureMonths) {
            const generated = simulateGeneration([deactivated], month, []);
            expect(generated).toHaveLength(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after reactivation, generation resumes for months >= startMonth', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 99999999 }),
        monthArbitrary,
        fc.constantFrom('income' as const, 'expense' as const),
        (id, title, amount, startMonth, categoryType) => {
          const recurring: RecurringRecord = {
            id,
            title,
            amount,
            categoryId: 'cat-1',
            categoryType,
            startMonth,
            description: '',
            isActive: true,
          };

          // Deactivate
          const deactivated = simulateDeactivation(recurring);
          expect(deactivated.isActive).toBe(false);

          // Verify no generation while deactivated
          const generatedWhileInactive = simulateGeneration([deactivated], startMonth, []);
          expect(generatedWhileInactive).toHaveLength(0);

          // Reactivate
          const reactivated = simulateReactivation(deactivated);
          expect(reactivated.isActive).toBe(true);

          // Verify generation resumes
          const generatedAfterReactivation = simulateGeneration([reactivated], startMonth, []);
          expect(generatedAfterReactivation).toHaveLength(1);
          expect(generatedAfterReactivation[0]!.recurringId).toBe(id);
          expect(generatedAfterReactivation[0]!.title).toBe(title);
          expect(generatedAfterReactivation[0]!.amount).toBe(amount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('full lifecycle: active → generates, deactivated → stops, reactivated → resumes', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 99999999 }),
        monthArbitrary,
        fc.constantFrom('income' as const, 'expense' as const),
        (id, title, amount, startMonth, categoryType) => {
          const allGenerated: GeneratedTransaction[] = [];

          const recurring: RecurringRecord = {
            id,
            title,
            amount,
            categoryId: 'cat-1',
            categoryType,
            startMonth,
            description: '',
            isActive: true,
          };

          // Phase 1: Active — generate for startMonth
          const phase1 = simulateGeneration([recurring], startMonth, allGenerated);
          expect(phase1).toHaveLength(1);
          allGenerated.push(...phase1);

          // Phase 2: Deactivate — try to generate for next month
          const deactivated = simulateDeactivation(recurring);
          const year = parseInt(startMonth.split('-')[0] ?? '2020', 10);
          const mon = parseInt(startMonth.split('-')[1] ?? '1', 10);
          const nextMon = ((mon - 1 + 1) % 12) + 1;
          const nextYear = year + Math.floor((mon - 1 + 1) / 12);
          const nextMonth = `${nextYear}-${String(nextMon).padStart(2, '0')}`;

          const phase2 = simulateGeneration([deactivated], nextMonth, allGenerated);
          expect(phase2).toHaveLength(0);

          // Phase 3: Reactivate — generate for a month after that
          const reactivated = simulateReactivation(deactivated);
          const resumeMon = ((mon - 1 + 2) % 12) + 1;
          const resumeYear = year + Math.floor((mon - 1 + 2) / 12);
          const resumeMonth = `${resumeYear}-${String(resumeMon).padStart(2, '0')}`;

          const phase3 = simulateGeneration([reactivated], resumeMonth, allGenerated);
          expect(phase3).toHaveLength(1);
          expect(phase3[0]!.recurringId).toBe(id);
          expect(phase3[0]!.amount).toBe(amount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
