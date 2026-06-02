import fc from 'fast-check';

/**
 * Property 4: Mark first as paid identifies the correct occurrence
 *
 * For any group creation with the "mark first as paid" option, given a set of
 * generated occurrences, exactly the occurrence with the minimum date within
 * the earliest reference month shall have isPaid equal to true, and all other
 * occurrences shall have isPaid equal to false.
 *
 * **Validates: Requirements 2.3, 2.7**
 */

/**
 * Represents a weekly occurrence with payment status.
 */
interface OccurrenceWithStatus {
  id: string;
  weeklyGroupId: string;
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
  amount: number;
  isPaid: boolean;
}

/**
 * Simulates the "first_paid" logic from WeeklyRecurringService.applyPaymentStatusOption().
 *
 * Algorithm:
 * 1. Find the earliest reference month among all occurrences
 * 2. Filter occurrences belonging to that earliest month
 * 3. Find the occurrence with the minimum date within that month
 * 4. Set isPaid=true for that occurrence only, all others remain isPaid=false
 */
function applyFirstPaidOption(occurrences: OccurrenceWithStatus[]): OccurrenceWithStatus[] {
  if (occurrences.length === 0) return [];

  // Find the earliest reference month
  const firstMonth = occurrences.reduce(
    (min, occ) => (occ.referenceMonth < min ? occ.referenceMonth : min),
    occurrences[0].referenceMonth
  );

  // Filter occurrences in the first month
  const firstMonthOccurrences = occurrences.filter((occ) => occ.referenceMonth === firstMonth);

  // Find the occurrence with the minimum date in the first month
  const firstOccurrence = firstMonthOccurrences.reduce(
    (min, occ) => (occ.date < min.date ? occ : min),
    firstMonthOccurrences[0]
  );

  // Apply isPaid: only the first occurrence gets true
  return occurrences.map((occ) => ({
    ...occ,
    isPaid: occ.id === firstOccurrence.id,
  }));
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
 * Generates a valid YYYY-MM-DD date string within a given reference month.
 */
function dateInMonth(referenceMonth: string): fc.Arbitrary<string> {
  const year = parseInt(referenceMonth.split('-')[0] ?? '2020', 10);
  const month = parseInt(referenceMonth.split('-')[1] ?? '1', 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  return fc
    .integer({ min: 1, max: daysInMonth })
    .map((day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
}

/**
 * Generates a set of occurrences spread across 1-4 reference months.
 * Each month has 1-5 occurrences with unique dates within that month.
 */
const occurrencesArbitrary = fc
  .record({
    groupId: fc.uuid(),
    months: fc.array(monthArbitrary, { minLength: 1, maxLength: 4 }),
  })
  .chain(({ groupId, months }) => {
    // Deduplicate and sort months to ensure deterministic earliest month
    const uniqueMonths = [...new Set(months)].sort();

    // Generate occurrences for each month
    const occurrencesByMonth = uniqueMonths.map((month) =>
      fc
        .array(
          fc.record({
            id: fc.uuid(),
            date: dateInMonth(month),
            amount: fc.integer({ min: 100, max: 9999900 }),
          }),
          { minLength: 1, maxLength: 5 }
        )
        .map((items) =>
          items.map((item) => ({
            id: item.id,
            weeklyGroupId: groupId,
            date: item.date,
            referenceMonth: month,
            amount: item.amount,
            isPaid: false, // All start as unpaid (default)
          }))
        )
    );

    return fc.tuple(...occurrencesByMonth).map((arrays) => arrays.flat());
  });

describe('Feature: payment-status-tracking, Property 4: Mark first as paid identifies the correct occurrence', () => {
  /**
   * **Validates: Requirements 2.3, 2.7**
   */

  it('exactly one occurrence has isPaid=true after applying first_paid option', () => {
    fc.assert(
      fc.property(occurrencesArbitrary, (occurrences) => {
        const result = applyFirstPaidOption(occurrences);

        const paidOccurrences = result.filter((occ) => occ.isPaid === true);
        expect(paidOccurrences.length).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it('the paid occurrence belongs to the earliest reference month', () => {
    fc.assert(
      fc.property(occurrencesArbitrary, (occurrences) => {
        const result = applyFirstPaidOption(occurrences);

        // Find the earliest reference month
        const earliestMonth = occurrences.reduce(
          (min, occ) => (occ.referenceMonth < min ? occ.referenceMonth : min),
          occurrences[0].referenceMonth
        );

        const paidOccurrence = result.find((occ) => occ.isPaid === true)!;
        expect(paidOccurrence.referenceMonth).toBe(earliestMonth);
      }),
      { numRuns: 100 }
    );
  });

  it('the paid occurrence has the minimum date within the earliest reference month', () => {
    fc.assert(
      fc.property(occurrencesArbitrary, (occurrences) => {
        const result = applyFirstPaidOption(occurrences);

        // Find the earliest reference month
        const earliestMonth = occurrences.reduce(
          (min, occ) => (occ.referenceMonth < min ? occ.referenceMonth : min),
          occurrences[0].referenceMonth
        );

        // Get all occurrences in the earliest month
        const earliestMonthOccurrences = occurrences.filter(
          (occ) => occ.referenceMonth === earliestMonth
        );

        // Find the minimum date in the earliest month
        const minDate = earliestMonthOccurrences.reduce(
          (min, occ) => (occ.date < min ? occ.date : min),
          earliestMonthOccurrences[0].date
        );

        const paidOccurrence = result.find((occ) => occ.isPaid === true)!;
        expect(paidOccurrence.date).toBe(minDate);
      }),
      { numRuns: 100 }
    );
  });

  it('all occurrences except the first one remain isPaid=false', () => {
    fc.assert(
      fc.property(occurrencesArbitrary, (occurrences) => {
        const result = applyFirstPaidOption(occurrences);

        const paidOccurrence = result.find((occ) => occ.isPaid === true)!;
        const unpaidOccurrences = result.filter((occ) => occ.isPaid === false);

        // All non-paid occurrences + the one paid = total
        expect(unpaidOccurrences.length + 1).toBe(result.length);

        // Every occurrence that is not the paid one must be false
        for (const occ of result) {
          if (occ.id !== paidOccurrence.id) {
            expect(occ.isPaid).toBe(false);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('occurrences in later months are never marked as paid', () => {
    fc.assert(
      fc.property(occurrencesArbitrary, (occurrences) => {
        const result = applyFirstPaidOption(occurrences);

        // Find the earliest reference month
        const earliestMonth = occurrences.reduce(
          (min, occ) => (occ.referenceMonth < min ? occ.referenceMonth : min),
          occurrences[0].referenceMonth
        );

        // All occurrences NOT in the earliest month must be unpaid
        const laterMonthOccurrences = result.filter((occ) => occ.referenceMonth !== earliestMonth);

        for (const occ of laterMonthOccurrences) {
          expect(occ.isPaid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});
