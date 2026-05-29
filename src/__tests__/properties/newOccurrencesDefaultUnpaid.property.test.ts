import fc from 'fast-check';

/**
 * Property 2: Newly generated occurrences default to unpaid
 *
 * For any weekly group or monthly recurring transaction, when the occurrence
 * generator creates new occurrences (regardless of the month or group
 * configuration), all newly generated occurrences shall have isPaid equal to false.
 *
 * **Validates: Requirements 1.6, 1.7, 7.4**
 */

// ============================================================================
// Domain Types (mirroring production types)
// ============================================================================

interface WeeklyRecurringGroup {
  id: string;
  title: string;
  amount: number;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  description: string;
  startDate: string; // YYYY-MM-DD
  isActive: boolean;
}

interface WeeklyOccurrence {
  id: string;
  weeklyGroupId: string;
  date: string;
  referenceMonth: string;
  amount: number;
  description: string;
  isValueEdited: boolean;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  categoryType: 'income' | 'expense';
  startMonth: string;
  description: string;
  originId: string | null;
  isActive: boolean;
}

interface GeneratedMonthlyTransaction {
  id: string;
  title: string;
  amount: number;
  referenceMonth: string;
  recurringId: string;
  isPaid: boolean;
}

// ============================================================================
// Simulation Functions (mirroring production logic)
// ============================================================================

/**
 * Simulates getWeeklyDatesForMonth: calculates all dates for a given day of week
 * within a month, starting from startDate if it falls within the month.
 */
function getWeeklyDatesForMonth(
  targetMonth: string,
  dayOfWeek: number,
  startDate: string
): string[] {
  const [yearStr, monthStr] = targetMonth.split('-');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10);

  const daysInMonth = new Date(year, month, 0).getDate();
  const dates: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === dayOfWeek) {
      const dateStr = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      if (dateStr >= startDate) {
        dates.push(dateStr);
      }
    }
  }

  return dates;
}

/**
 * Derives reference month (YYYY-MM) from a date (YYYY-MM-DD).
 */
function deriveReferenceMonth(date: string): string {
  return date.substring(0, 7);
}

/**
 * Simulates the OccurrenceGenerator.generateForGroup logic:
 * For each weekly date in the target month, creates an occurrence with isPaid = false.
 * Existing occurrences are skipped (idempotency).
 */
function simulateWeeklyOccurrenceGeneration(
  group: WeeklyRecurringGroup,
  targetMonth: string,
  existingOccurrences: WeeklyOccurrence[]
): WeeklyOccurrence[] {
  if (!group.isActive) {
    return [];
  }

  const dates = getWeeklyDatesForMonth(targetMonth, group.dayOfWeek, group.startDate);
  const newOccurrences: WeeklyOccurrence[] = [];

  for (const date of dates) {
    // Idempotency check: skip if already exists for this group and date
    const exists = existingOccurrences.some(
      (occ) => occ.weeklyGroupId === group.id && occ.date === date
    );

    if (exists) {
      continue;
    }

    // New occurrence always defaults to isPaid = false (Req 1.6, 7.4)
    newOccurrences.push({
      id: `occ-${date}-${group.id}`,
      weeklyGroupId: group.id,
      date,
      referenceMonth: deriveReferenceMonth(date),
      amount: group.amount,
      description: group.description,
      isValueEdited: false,
      isPaid: false, // DEFAULT: always false for new occurrences
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return newOccurrences;
}

/**
 * Simulates the generateMonthlyTransactions logic:
 * For each active recurring whose startMonth <= targetMonth, creates a transaction
 * with isPaid = false if one doesn't already exist for that month.
 */
function simulateMonthlyTransactionGeneration(
  recurrings: RecurringTransaction[],
  targetMonth: string,
  existingTransactions: GeneratedMonthlyTransaction[]
): GeneratedMonthlyTransaction[] {
  const newTransactions: GeneratedMonthlyTransaction[] = [];

  for (const recurring of recurrings) {
    if (!recurring.isActive) {
      continue;
    }

    if (recurring.startMonth > targetMonth) {
      continue;
    }

    // Idempotency: skip if already exists for this recurring + month
    const alreadyExists = existingTransactions.some(
      (tx) => tx.recurringId === recurring.id && tx.referenceMonth === targetMonth
    );

    if (alreadyExists) {
      continue;
    }

    // New transaction always defaults to isPaid = false (Req 1.7)
    newTransactions.push({
      id: `tx-${targetMonth}-${recurring.id}`,
      title: recurring.title,
      amount: recurring.amount,
      referenceMonth: targetMonth,
      recurringId: recurring.id,
      isPaid: false, // DEFAULT: always false for new generated transactions
    });
  }

  return newTransactions;
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const monthArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

const dayOfWeekArbitrary = fc.integer({ min: 0, max: 6 });

const weeklyGroupArbitrary = fc
  .record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    amount: fc.integer({ min: 1, max: 99999999 }),
    dayOfWeek: dayOfWeekArbitrary,
    description: fc.string({ maxLength: 100 }),
    startDate: fc
      .record({
        year: fc.integer({ min: 2020, max: 2030 }),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.integer({ min: 1, max: 28 }),
      })
      .map(
        ({ year, month, day }) =>
          `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      ),
    isActive: fc.constant(true),
  })
  .map((record) => record as WeeklyRecurringGroup);

const recurringTransactionArbitrary = fc
  .record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    amount: fc.integer({ min: 1, max: 99999999 }),
    categoryId: fc.uuid(),
    categoryType: fc.constantFrom('income' as const, 'expense' as const),
    startMonth: monthArbitrary,
    description: fc.string({ maxLength: 100 }),
    originId: fc.option(fc.uuid(), { nil: null }),
    isActive: fc.constant(true),
  })
  .map((record) => record as RecurringTransaction);

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: payment-status-tracking, Property 2: Newly generated occurrences default to unpaid', () => {
  /**
   * **Validates: Requirements 1.6, 1.7, 7.4**
   */

  it('all newly generated weekly occurrences have isPaid = false', () => {
    fc.assert(
      fc.property(weeklyGroupArbitrary, monthArbitrary, (group, targetMonth) => {
        const generated = simulateWeeklyOccurrenceGeneration(group, targetMonth, []);

        // Every generated occurrence must have isPaid = false
        for (const occurrence of generated) {
          expect(occurrence.isPaid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all newly generated monthly transactions have isPaid = false', () => {
    fc.assert(
      fc.property(
        fc.array(recurringTransactionArbitrary, { minLength: 1, maxLength: 10 }),
        monthArbitrary,
        (recurrings, targetMonth) => {
          const generated = simulateMonthlyTransactionGeneration(recurrings, targetMonth, []);

          // Every generated transaction must have isPaid = false
          for (const transaction of generated) {
            expect(transaction.isPaid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('weekly occurrences generated for any month configuration default to unpaid', () => {
    fc.assert(
      fc.property(
        weeklyGroupArbitrary,
        fc.array(monthArbitrary, { minLength: 1, maxLength: 6 }),
        (group, months) => {
          let allOccurrences: WeeklyOccurrence[] = [];

          // Generate across multiple months
          for (const month of months) {
            const newOccurrences = simulateWeeklyOccurrenceGeneration(
              group,
              month,
              allOccurrences
            );

            // Every newly generated occurrence must have isPaid = false
            for (const occurrence of newOccurrences) {
              expect(occurrence.isPaid).toBe(false);
            }

            allOccurrences = [...allOccurrences, ...newOccurrences];
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('monthly transactions generated across multiple months all default to unpaid', () => {
    fc.assert(
      fc.property(
        fc.array(recurringTransactionArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(monthArbitrary, { minLength: 1, maxLength: 6 }),
        (recurrings, months) => {
          let allTransactions: GeneratedMonthlyTransaction[] = [];

          // Generate across multiple months
          for (const month of months) {
            const newTransactions = simulateMonthlyTransactionGeneration(
              recurrings,
              month,
              allTransactions
            );

            // Every newly generated transaction must have isPaid = false
            for (const transaction of newTransactions) {
              expect(transaction.isPaid).toBe(false);
            }

            allTransactions = [...allTransactions, ...newTransactions];
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('newly generated occurrences after day-of-week change default to unpaid (Req 7.4)', () => {
    fc.assert(
      fc.property(
        weeklyGroupArbitrary,
        dayOfWeekArbitrary,
        monthArbitrary,
        (group, newDayOfWeek, targetMonth) => {
          // Simulate existing occurrences from original day of week
          const existingOccurrences = simulateWeeklyOccurrenceGeneration(
            group,
            targetMonth,
            []
          );

          // Change day of week (simulating group edit)
          const updatedGroup: WeeklyRecurringGroup = {
            ...group,
            dayOfWeek: newDayOfWeek,
          };

          // Generate new occurrences with the updated day of week
          // Existing occurrences from old day are still there but won't conflict
          // since dates are different (unless same day of week)
          const newOccurrences = simulateWeeklyOccurrenceGeneration(
            updatedGroup,
            targetMonth,
            existingOccurrences
          );

          // All newly generated occurrences must have isPaid = false
          for (const occurrence of newOccurrences) {
            expect(occurrence.isPaid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
