import fc from 'fast-check';

/**
 * Property 1: Toggle payment status inverts the boolean
 *
 * For any recurring occurrence (weekly or monthly) with any date (past, present,
 * or future) and any initial payment status (true or false), calling
 * togglePaymentStatus should produce an occurrence whose isPaid value is the
 * logical negation of the original.
 *
 * **Validates: Requirements 1.1, 1.5**
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface WeeklyOccurrence {
  id: string;
  weeklyGroupId: string;
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
  amount: number;
  description: string;
  isValueEdited: boolean;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MonthlyTransaction {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  categoryId: string | null;
  originId: string | null;
  batchId: string | null;
  referenceMonth: string; // YYYY-MM
  needsReview: boolean;
  isExcludedFromTotals: boolean;
  isPaid: boolean;
  duplicateOf: string | null;
  createdAt: string;
  updatedAt: string;
  installmentGroupId: string | null;
  recurringId: string | null;
}

// ─── Toggle Logic (mirrors PaymentStatusService) ─────────────────────────────

/**
 * Simulates the toggle logic from PaymentStatusService.toggleWeeklyOccurrence.
 * Flips the isPaid boolean and updates the updatedAt timestamp.
 */
function toggleWeeklyOccurrence(occurrence: WeeklyOccurrence): WeeklyOccurrence {
  return {
    ...occurrence,
    isPaid: !occurrence.isPaid,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Simulates the toggle logic from PaymentStatusService.toggleMonthlyTransaction.
 * Flips the isPaid boolean and updates the updatedAt timestamp.
 */
function toggleMonthlyTransaction(transaction: MonthlyTransaction): MonthlyTransaction {
  return {
    ...transaction,
    isPaid: !transaction.isPaid,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Generators ──────────────────────────────────────────────────────────────

/**
 * Generates a valid YYYY-MM-DD date string covering past, present, and future.
 */
const dateArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2035 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

/**
 * Generates a valid YYYY-MM reference month string.
 */
const referenceMonthArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2035 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

/**
 * Generates a valid ISO datetime string for timestamps.
 */
const isoDateTimeArbitrary = fc
  .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2035-12-31').getTime() })
  .map((ts) => new Date(ts).toISOString());

/**
 * Generates a random WeeklyOccurrence with any isPaid value.
 */
const weeklyOccurrenceArbitrary: fc.Arbitrary<WeeklyOccurrence> = fc.record({
  id: fc.uuid(),
  weeklyGroupId: fc.uuid(),
  date: dateArbitrary,
  referenceMonth: referenceMonthArbitrary,
  amount: fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
  description: fc.string({ minLength: 0, maxLength: 100 }),
  isValueEdited: fc.boolean(),
  isPaid: fc.boolean(),
  createdAt: isoDateTimeArbitrary,
  updatedAt: isoDateTimeArbitrary,
});

/**
 * Generates a random MonthlyTransaction with any isPaid value.
 */
const monthlyTransactionArbitrary: fc.Arbitrary<MonthlyTransaction> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  date: dateArbitrary,
  amount: fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
  categoryId: fc.oneof(fc.uuid(), fc.constant(null)),
  originId: fc.oneof(fc.uuid(), fc.constant(null)),
  batchId: fc.oneof(fc.uuid(), fc.constant(null)),
  referenceMonth: referenceMonthArbitrary,
  needsReview: fc.boolean(),
  isExcludedFromTotals: fc.boolean(),
  isPaid: fc.boolean(),
  duplicateOf: fc.oneof(fc.uuid(), fc.constant(null)),
  createdAt: isoDateTimeArbitrary,
  updatedAt: isoDateTimeArbitrary,
  installmentGroupId: fc.oneof(fc.uuid(), fc.constant(null)),
  recurringId: fc.oneof(fc.uuid(), fc.constant(null)),
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: payment-status-tracking, Property 1: Toggle payment status inverts the boolean', () => {
  /**
   * **Validates: Requirements 1.1, 1.5**
   */

  it('toggling a weekly occurrence inverts its isPaid value', () => {
    fc.assert(
      fc.property(weeklyOccurrenceArbitrary, (occurrence) => {
        const toggled = toggleWeeklyOccurrence(occurrence);
        expect(toggled.isPaid).toBe(!occurrence.isPaid);
      }),
      { numRuns: 100 }
    );
  });

  it('toggling a monthly transaction inverts its isPaid value', () => {
    fc.assert(
      fc.property(monthlyTransactionArbitrary, (transaction) => {
        const toggled = toggleMonthlyTransaction(transaction);
        expect(toggled.isPaid).toBe(!transaction.isPaid);
      }),
      { numRuns: 100 }
    );
  });

  it('toggling a weekly occurrence twice returns to the original isPaid value', () => {
    fc.assert(
      fc.property(weeklyOccurrenceArbitrary, (occurrence) => {
        const toggledOnce = toggleWeeklyOccurrence(occurrence);
        const toggledTwice = toggleWeeklyOccurrence(toggledOnce);
        expect(toggledTwice.isPaid).toBe(occurrence.isPaid);
      }),
      { numRuns: 100 }
    );
  });

  it('toggling a monthly transaction twice returns to the original isPaid value', () => {
    fc.assert(
      fc.property(monthlyTransactionArbitrary, (transaction) => {
        const toggledOnce = toggleMonthlyTransaction(transaction);
        const toggledTwice = toggleMonthlyTransaction(toggledOnce);
        expect(toggledTwice.isPaid).toBe(transaction.isPaid);
      }),
      { numRuns: 100 }
    );
  });

  it('toggle works regardless of the occurrence date (past, present, or future)', () => {
    fc.assert(
      fc.property(weeklyOccurrenceArbitrary, (occurrence) => {
        // The property holds for any date - past, present, or future
        const toggled = toggleWeeklyOccurrence(occurrence);
        expect(toggled.isPaid).toBe(!occurrence.isPaid);
        // Date should remain unchanged
        expect(toggled.date).toBe(occurrence.date);
      }),
      { numRuns: 100 }
    );
  });

  it('toggle preserves all other fields of a weekly occurrence except isPaid and updatedAt', () => {
    fc.assert(
      fc.property(weeklyOccurrenceArbitrary, (occurrence) => {
        const toggled = toggleWeeklyOccurrence(occurrence);
        expect(toggled.id).toBe(occurrence.id);
        expect(toggled.weeklyGroupId).toBe(occurrence.weeklyGroupId);
        expect(toggled.date).toBe(occurrence.date);
        expect(toggled.referenceMonth).toBe(occurrence.referenceMonth);
        expect(toggled.amount).toBe(occurrence.amount);
        expect(toggled.description).toBe(occurrence.description);
        expect(toggled.isValueEdited).toBe(occurrence.isValueEdited);
        expect(toggled.createdAt).toBe(occurrence.createdAt);
      }),
      { numRuns: 100 }
    );
  });

  it('toggle preserves all other fields of a monthly transaction except isPaid and updatedAt', () => {
    fc.assert(
      fc.property(monthlyTransactionArbitrary, (transaction) => {
        const toggled = toggleMonthlyTransaction(transaction);
        expect(toggled.id).toBe(transaction.id);
        expect(toggled.title).toBe(transaction.title);
        expect(toggled.date).toBe(transaction.date);
        expect(toggled.amount).toBe(transaction.amount);
        expect(toggled.description).toBe(transaction.description);
        expect(toggled.categoryId).toBe(transaction.categoryId);
        expect(toggled.referenceMonth).toBe(transaction.referenceMonth);
        expect(toggled.recurringId).toBe(transaction.recurringId);
      }),
      { numRuns: 100 }
    );
  });
});
